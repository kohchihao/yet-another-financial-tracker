/**
 * Playwright drive for the signed-out dashboard redirect and the GitHub
 * OAuth handoff. Does not type credentials or submit GitHub's login form.
 *
 * Requires NODE_PATH to include a playwright install (drive.sh sets this)
 * and Google Chrome (`channel: 'chrome'`), which avoids a browser download.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const evidence = process.env.VERIFY_CSPX_EVIDENCE || "/tmp/verify-cspx-evidence";
const origin = process.env.VERIFY_CSPX_ORIGIN || "http://localhost:3000";

function writeJson(name, value) {
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + "\n");
}

async function redirectHops(response) {
  const hops = [];
  let request = response ? response.request() : null;
  while (request) {
    const hopResponse = await request.response();
    hops.push({
      url: request.url(),
      status: hopResponse ? hopResponse.status() : null,
    });
    request = request.redirectedFrom();
  }
  hops.reverse();
  return hops;
}

function isGithubAuthorizeHandoff(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.hostname !== "github.com") return false;
  if (url.pathname === "/login/oauth/authorize") return true;
  const returnTo = url.searchParams.get("return_to") || "";
  return url.pathname === "/login" && returnTo.includes("/login/oauth/authorize");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const githubRequests = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith("https://github.com/login")) githubRequests.push(url);
  });

  try {
    const response = await page.goto(`${origin}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.getByRole("button", { name: "Sign in with GitHub", exact: true }).waitFor({
      timeout: 15000,
    });

    const finalUrl = page.url();
    const hops = await redirectHops(response);
    const qian = await page.getByText("Qian Inc.", { exact: true }).count();
    const welcome = await page.getByText("Welcome back", { exact: true }).count();
    const planning = await page.getByText("Sign in to start planning", { exact: true }).count();
    const has307 = hops.some(
      (hop) => hop.status === 307 && hop.url === `${origin}/dashboard`,
    );
    const onSignIn = finalUrl === `${origin}/sign-in`;
    const signedOutPass = Boolean(has307 && onSignIn && qian && welcome && planning);

    await page.screenshot({
      path: path.join(evidence, "dashboard-redirect-sign-in.png"),
      fullPage: true,
    });
    const signedOut = {
      pass: signedOutPass,
      finalUrl,
      hops,
      markers: { qian, welcome, planning },
    };
    writeJson("signed-out.json", signedOut);
    console.log(signedOutPass ? "PASS signed-out-dashboard" : "FAIL signed-out-dashboard");
    console.log(JSON.stringify(signedOut, null, 2));
    if (!signedOutPass) process.exitCode = 1;

    await page.getByRole("button", { name: "Sign in with GitHub", exact: true }).click();
    await page.waitForURL((url) => isGithubAuthorizeHandoff(url.toString()), { timeout: 20000 });

    const githubUrl = page.url();
    const username = page.locator("#login_field");
    if ((await username.count()) > 0 && (await username.inputValue()) !== "") {
      throw new Error("github: the login field was filled; this check must not log in");
    }

    await page.screenshot({
      path: path.join(evidence, "github-authorize.png"),
      fullPage: true,
    });
    const authorizeRequests = githubRequests.filter((url) =>
      url.includes("/login/oauth/authorize"),
    );
    const clientIdUnset = authorizeRequests.some((url) => url.includes("client_id=undefined"));
    const github = {
      pass: isGithubAuthorizeHandoff(githubUrl) && authorizeRequests.length > 0,
      finalUrl: githubUrl,
      authorizeRequests,
      clientIdLiteralUndefined: clientIdUnset,
      loggedIn: false,
      note: clientIdUnset
        ? "AUTH_GITHUB_ID is unset on this local deployment, so the authorize URL carries client_id=undefined. GitHub then sends the browser to /login with return_to set to /login/oauth/authorize. No secret was read or set, and the login form was not submitted."
        : "The authorize request included a client_id other than the literal undefined. The check still did not submit GitHub's login form and did not read AUTH_GITHUB_SECRET.",
    };
    writeJson("github-oauth.json", github);
    console.log(github.pass ? "PASS github-sign-in" : "FAIL github-sign-in");
    console.log(JSON.stringify(github, null, 2));
    if (!github.pass) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error("FAIL drive-ui");
  console.error(error);
  process.exit(1);
});
