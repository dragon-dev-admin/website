export const WALKTHROUGH_CONTENT = `# Alpha Dragon Module Walkthrough

This guide is for builders who want to use existing modules or publish their own.

## Use a Playground Module Locally

1. Download the extension from GitHub.
2. Download a module zip from \`https://alpha-dragon.ai/playground\`.
3. Unzip the package.
4. Move the unzipped module folder into:

\`\`\`text
ext-dragon/modules/
\`\`\`

5. From \`ext-dragon\`, run:

\`\`\`bash
npm run modules:sync
\`\`\`

6. Open Chrome and go to \`chrome://extensions\`.
7. Enable Developer Mode.
8. Click \`Load unpacked\` and select the \`ext-dragon\` folder, or click reload if it is already loaded.
9. Open the sidepanel and submit a contract address.

The module order follows the numeric folder prefix, such as \`1_token_info\`, \`2_sniper_analysis\`, and \`5_wallet_risk\`.

## Create a New Module

1. Copy one of the built-in module folders.
2. Rename it with the next sequence number:

\`\`\`text
5_wallet_risk
\`\`\`

3. Update \`module.json\`.
4. Update \`module.js\`.
5. Add a thumbnail image named \`thumbnail.png\`.
6. Run:

\`\`\`bash
npm run modules:sync
\`\`\`

7. Reload the extension and test with a contract address.

Copied folders are allowed for quick experiments. The sync script will auto-alias duplicate module ids so the extension still loads.

Before publishing a real new module, rename the copied module properly:

\`\`\`text
Change the folder number/name
Change module.json id
Change module.json sequence
Change module.js metadata id/name
Change HTML ids inside module.js
Run npm run modules:sync
Reload the unpacked extension
\`\`\`

If a copied module keeps the original DOM ids, it may render but it will not behave as an independent module.

Minimum \`module.js\`:

\`\`\`js
export const metadata = {
  id: 'wallet_risk',
  sequence: 5,
  name: 'Wallet Risk',
  description: 'Scores risky wallet behavior from token holder data.',
  dataInputs: ['contractAddress'],
  dataApis: ['fetchData'],
};

export async function mount({ root }) {
  root.innerHTML = '<section class="wallet-risk">Wallet Risk</section>';
}

export async function reset() {}
export async function load({ contractAddress }) {}
export async function destroy() {}
\`\`\`

## Zip and Share a Module

From inside \`ext-dragon/modules\`, zip the module folder:

\`\`\`bash
zip -r wallet_risk.zip 5_wallet_risk
\`\`\`

Go to \`https://alpha-dragon.ai/playground\`, sign in, and upload:

\`\`\`text
Module name
Thumbnail image
Brief description
Setup instructions
Data inputs
Data API names
Module zip
\`\`\`

Uploaded modules publish immediately as active Playground packages.

## Non-Developer Flow

1. Download the Chrome extension from GitHub.
2. Download a module zip from the custom Playground.
3. Ask a developer or technical teammate to unzip it into \`ext-dragon/modules/\`.
4. Ask them to run \`npm run modules:sync\`.
5. Reload the unpacked extension in Chrome.
6. Test the module with a contract address.
7. If you have a module idea, sign in to the Playground and upload a draft package with setup notes.

## Playground Accounts

Anyone can browse and vote. The Playground uses Firebase anonymous auth for public votes so one browser identity cannot vote repeatedly on the same module.

Uploading requires email/password auth or Google sign-in.

Root admins are created in Firebase Auth first. Then add this Firestore document:

\`\`\`text
admins/{uid}
  role: "root"
  createdAt: serverTimestamp()
\`\`\`

Root admins can disable, enable, mark deleted, restore, blacklist, and unblacklist uploaders from \`/playground/admin.html\`.

## Important Security Rule

The extension does not load or run Playground code remotely. Every module is downloaded, reviewed, copied into the local extension, synced into the generated registry, and loaded from the local unpacked extension.
`;
