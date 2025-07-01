# pano-data-extract
Data extractor for the Panopto site

**Author:** Samuel Chan

## Overview

This repository contains Tampermonkey scripts to extract data from Panopto settings pages: Folders, Remote Recorders, and Users. Each script adds an "Extract" button below the page heading. Clicking the button will gradually pull all relevant data and download it as a CSV file to your local drive.

## Scripts Details

### scripts/tm_rip_pano_folders.js
- Adds an Extract button to the Folders settings page in Panopto.
- When clicked, it collects information about all folders, including folder names, IDs, parent folders, permissions, and other metadata.
- The script handles pagination and nested folders, ensuring all folders are included.
- After gathering the data, it downloads a CSV file containing the folder details.

### scripts/tm_rip_pano_remote_recorders.js
- Adds an Extract button to the Remote Recorders settings page.
- When clicked, it extracts details about all remote recorders, such as recorder names, IDs, status, associated folders, and other relevant information.
- The script processes all available recorders, even if they span multiple pages.
- The data is compiled and downloaded as a CSV file.

### scripts/tm_rip_pano_users.js
- Adds an Extract button to the Users settings page.
- When clicked, it pulls user data including usernames, email addresses, roles, group memberships, and other user attributes.
- The script iterates through all users, handling pagination as needed.
- Once complete, a CSV file with all user information is downloaded.

## Prerequisites

- A common browser, including Google Chrome browser, Firefox, Microsoft Edge, or Safari.
- [Tampermonkey extension](https://www.tampermonkey.net/) installed

## Installing Tampermonkey

### Installing Tampermonkey on Chrome

1. Open Chrome and go to the [Tampermonkey Chrome Web Store page](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Click **Add to Chrome**.
3. Confirm by clicking **Add extension**.

### Installing Tampermonkey on Firefox

1. Open Firefox and visit the [Tampermonkey for Firefox page](https://addons.mozilla.org/firefox/addon/tampermonkey/).
2. Click **Add to Firefox**.
3. Confirm by clicking **Add** in the prompt.

### Installing Tampermonkey on Microsoft Edge

1. Open Edge and go to the [Tampermonkey Edge Add-ons page](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Click **Get**.
3. Confirm by clicking **Add extension**.

### Installing Tampermonkey on Safari

1. Open the Mac App Store and search for **Tampermonkey**.
2. Click **Get** or **Install**.
3. Follow the prompts to complete the installation.

## Installing the Scripts

1. Open Tampermonkey by clicking its icon in the Chrome toolbar and selecting **Dashboard**.
2. Click the **+** (Create a new script) button.
3. Open the desired script file from the `scripts` folder in this repository (e.g., `tm_rip_pano_folders.js`).
4. Copy the entire script content and paste it into the Tampermonkey editor.
5. Click **File > Save** (or press `Ctrl+S`).
6. Repeat for each script you want to use.

## Using the Scripts

1. Log in and navigate to the relevant Panopto settings page (Folders, Remote Recorders, or Users).
2. You will see an **Extract** button below the page heading.
3. Click the **Extract** button.
4. Wait while the script pulls the data. Do not navigate away from the page until the process is complete.
5. When finished, a CSV file will be automatically downloaded to your computer.

## Notes

- Make sure Tampermonkey is enabled in Chrome.
- Only use the script on the intended Panopto settings pages.
- If you encounter issues, try refreshing the page or reinstalling the script.
