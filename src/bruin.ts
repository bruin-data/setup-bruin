import * as os from "os";
import * as path from "path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { Octokit } from "@octokit/core";
import { Error, isError } from "./error";
import { HttpsProxyAgent } from "https-proxy-agent";

export async function getBruin(
  version: string,
): Promise<string | Error> {
  const binaryPath = tc.find("bruin", version, os.arch());
  if (binaryPath !== "") {
    core.info(`Found in cache @ ${binaryPath}`);
    return binaryPath;
  }

  core.info(`Resolving the download URL for the current platform...`);
  const downloadURL = await getDownloadURL(version);

  if (isError(downloadURL)) {
    return downloadURL;
  }

  let cacheDir = "";
  core.info(`Downloading bruin version "${version}" from ${downloadURL}`);
  if (downloadURL.endsWith(".tar.gz")) {
    const downloadPath = await tc.downloadTool(downloadURL);
    core.info(
      `Successfully downloaded bruin version "${version}" from ${downloadURL}`,
    );

    core.info("Extracting bruin...");
    const extractPath = await tc.extractTar(downloadPath);
    core.info(`Successfully extracted bruin to ${extractPath}`);

    core.info("Adding bruin to the cache...");
    cacheDir = await tc.cacheDir(
      extractPath,
      "bruin",
      version,
      os.arch(),
    );
  } else {

     // For Windows, we only download the .exe for `bruin` CLI becasue we do not create `.tar.gz`
    // bundles for Windows releases.
    const downloadPath = await tc.downloadTool(
      downloadURL,
      "C:\\Users\\runneradmin\\bruin-download\\bruin.zip",
    );
       
    core.info(
      `Successfully downloaded bruin version "${version}" from ${downloadURL} to ${downloadPath}`,
    );

    const extractPath = await tc.extractZip(downloadPath);
    core.info(`Successfully extracted bruin to ${extractPath}`);
    
    core.info("Adding bruin to the cache...");
    cacheDir = await tc.cacheDir(
      extractPath,
      "bruin",
      version,
      os.arch(),
    );
  }
  core.info(`Successfully cached bruin to ${cacheDir}`);
  return cacheDir;
}

// getDownloadURL resolves Bruin's Github download URL for the
// current architecture and platform.
async function getDownloadURL(
  version: string
): Promise<string | Error> {
  let architecture = "";
  switch (os.arch()) {
    // The available architectures can be found at:
    // https://nodejs.org/api/process.html#process_process_arch
    case "x64":
      architecture = "x86_64";
      break;
    case "arm64":
      architecture = "arm64";
      break;
    default:
      return {
        message: `The "${os.arch()}" architecture is not supported with a Bruin release.`,
      };
  }
  let platform = "";
  switch (os.platform()) {
    // The available platforms can be found at:
    // https://nodejs.org/api/process.html#process_process_platform
    case "linux":
      platform = "Linux";
      break;
    case "darwin":
      platform = "Darwin";
      break;
    case "win32":
      platform = "Windows";
      break;
    default:
      return {
        message: `The "${os.platform()}" platform is not supported with a Bruin release.`,
      };
  }
  // The asset name is determined by the bruin release structure found at:
  // https://github.com/bruin-data/bruin/blob/8255257bd94c9f1b5faa27242211c5caad05be79/make/bruin/scripts/release.bash#L102
  let assetName = "";


  // For Windows, we only download the .exe for `bruin` CLI
  if (platform === "Windows") {
    assetName = `bruin_${platform}_${architecture}.zip`;
  } else {
    assetName = `bruin_${platform}_${architecture}.tar.gz`;
  }

  const requestAgent = process.env.http_proxy
    ? new HttpsProxyAgent(process.env.http_proxy)
    : undefined;
  const octokit = new Octokit({
    request: {
      agent: requestAgent,
    },
  });
  if (version === "latest") {
    const { data: releases } = await octokit.request(
      "GET /repos/{owner}/{repo}/releases",
      {
        owner: "bruin-data",
        repo: "bruin",
        per_page: 1,
      },
    );
    for (const asset of releases[0].assets) {
      if (assetName === asset.name) {
        return asset.browser_download_url;
      }
    }
    return {
      message: `Unable to find Bruin version "${version}" for platform "${platform}" and architecture "${architecture}".`,
    };
  }
  const tag = releaseTagForVersion(version);
  const { data: release } = await octokit.request(
    "GET /repos/{owner}/{repo}/releases/tags/{tag}",
    {
      owner: "bruin-data",
      repo: "bruin",
      tag: tag,
    },
  );
  for (const asset of release.assets) {
    if (assetName === asset.name) {
      return asset.browser_download_url;
    }
  }
  return {
    message: `Unable to find Bruin version "${version}" for platform "${platform}" and architecture "${architecture}".`,
  };
}

// releaseTagForVersion returns the release tag name based on a given version configuration.
// Github releases include the 'v' prefix, but the `bruin --version` does not. Thus, we permit
// both versions, e.g. v0.38.0 and 0.38.0.
function releaseTagForVersion(version: string): string {
  return version;
}
