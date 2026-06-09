export const WALKTHROUGH_CONTENT = `# Alpha Dragon Module Development

Alpha Dragon modules live in \`ext-dragon/modules/\` as numbered folders. The numeric prefix controls render order in the sidepanel.

\`\`\`text
modules/
  1_token_info/
    module.json
    module.js
    module.css
    README.md
    thumbnail.png
  2_sniper_analysis/
  registry.js
\`\`\`

\`modules/registry.js\` is generated. Do not edit it by hand.

## Folder Naming

Use this format:

\`\`\`text
{sequence}_{module_name}
\`\`\`

Examples:

\`\`\`text
1_token_info
2_sniper_analysis
5_wallet_risk
\`\`\`

After adding, removing, or renaming a module folder, run:

\`\`\`bash
npm run modules:sync
\`\`\`

The sync script scans \`modules/[0-9]_*\`, sorts by folder prefix, and regenerates \`modules/registry.js\`.

Duplicates are allowed so a contributor can copy a module and experiment without breaking the registry. If two modules use the same \`module.json\` id, the sync script gives later copies a safe runtime id such as \`bundle_analysis__5_bundle_analysis\`.

For a real contribution, the copied module should still be renamed before publishing. Update the folder number, \`module.json\` id, \`module.json\` sequence, display name, and DOM ids inside \`module.js\`. If the copied module keeps DOM ids such as \`bundleDistChart\`, it can render but it will share IDs with the original module and will not behave as an independent feature.

## Metadata

Each module needs a \`module.json\`.

\`\`\`json
{
  "id": "wallet_risk",
  "sequence": 5,
  "name": "Wallet Risk",
  "description": "Scores risky wallet behavior from token holder data.",
  "dataInputs": ["contractAddress", "backendReport"],
  "dataApis": ["fetchData", "custom-rpc"],
  "thumbnail": "thumbnail.png",
  "css": "module.css",
  "entry": "module.js"
}
\`\`\`

Keep \`id\` stable once published. It is used by the loader, docs, and Playground packages.

## Contributor Checklist

Before opening a pull request or uploading a module package:

- Folder uses the intended order number, such as 5_wallet_risk
- module.json sequence matches the folder number
- module.json id is unique for a new feature
- module.js metadata uses the same id/name
- HTML ids/classes inside module.js are unique to the module
- npm run modules:sync completes
- Chrome extension is reloaded from chrome://extensions

## JavaScript API

Each \`module.js\` exports metadata and lifecycle methods:

\`\`\`js
export const metadata = {
  id: 'wallet_risk',
  sequence: 5,
  name: 'Wallet Risk',
  description: 'Scores risky wallet behavior from token holder data.',
  dataInputs: ['contractAddress', 'backendReport'],
  dataApis: ['fetchData', 'custom-rpc'],
};

export async function mount({ root, context }) {
  root.innerHTML = '<section class="wallet-risk">Waiting for a contract.</section>';
}

export async function reset({ context }) {
  // Clear visual state before the next contract loads.
}

export async function load({ contractAddress, context }) {
  // Read the new contract address and refresh this module.
}

export async function destroy() {
  // Tear down listeners, timers, observers, or charts if needed.
}
\`\`\`

## Lifecycle

**mount({ root, context })**
Renders the module UI inside the provided root element.

**reset({ context })**
Clears stale state before a new contract loads.

**load({ contractAddress, context })**
Runs when a contract address is submitted. One module failure is isolated by the loader and does not stop other modules.

**destroy()**
Reserved for cleanup when future UI surfaces unload modules dynamically.

## Context

\`context\` is created by \`core/module-context.js\`. It currently provides:

\`\`\`js
context.getContractAddress();
context.getUid();
context.emit(eventName, payload);
context.on(eventName, handler);
\`\`\`

Use events for cross-module coordination instead of reaching into another module's DOM.

## Styling

Each module can ship a \`module.css\`. Keep styles scoped to module classes or stable IDs inside that module.

Recommended:

\`\`\`css
.wallet-risk {
  border: 1px solid var(--panel-border);
}
\`\`\`

Avoid global selectors such as \`button\`, \`section\`, or \`canvas\` unless the shared shell owns them.

## Chart Helpers

Shared helpers live in \`core/chart-helpers.js\`. Prefer shared helpers for chart teardown and repeated chart safety patterns.

If a module creates its own Chart.js instance, store the instance and destroy it during \`reset()\` or \`destroy()\`.

## Local Testing

1. Add or edit a module folder.
2. Run: \`npm run modules:sync\`
3. Reload the unpacked extension from \`chrome://extensions\`.
4. Open the sidepanel and submit a contract address.
5. Confirm the module appears in the expected order.
6. Temporarily move a module folder out of \`modules/\`, run the sync command, and confirm it disappears.
7. Move it back, run the sync command again, and confirm it returns.

## Safety Rules

The extension must never execute remote code from the Playground. The Playground only distributes zip packages. Developers download a zip, review it locally, unzip it into \`ext-dragon/modules/\`, run \`npm run modules:sync\`, and reload the unpacked extension.

Do not add external runtime scripts to a module. If a dependency is needed, vendor it into the extension or discuss it before publishing.

## Built-In Modules

The current built-ins are:

\`\`\`text
1_token_info
2_sniper_analysis
3_holder_analysis
4_bundle_analysis
\`\`\`

These modules preserve the existing sidepanel behavior while giving contributors a clear place to work.
`;
