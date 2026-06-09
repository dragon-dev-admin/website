export const WalkthroughContent = () => {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-slate-300">
      <div>
        <h1 className="text-2xl font-black text-white mb-2">Alpha Dragon Module Walkthrough</h1>
        <p>This guide is for builders who want to use existing modules or publish their own.</p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-emerald-300 mb-3">Use a Playground Module Locally</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Download the extension from GitHub.</li>
          <li>Download a module zip from <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">https://alpha-dragon.ai/playground</code>.</li>
          <li>Unzip the package.</li>
          <li>Move the unzipped module folder into:
            <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
              <code>ext-dragon/modules/</code>
            </pre>
          </li>
          <li>From <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">ext-dragon</code>, run:
            <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
              <code>npm run modules:sync</code>
            </pre>
          </li>
          <li>Open Chrome and go to <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">chrome://extensions</code>.</li>
          <li>Enable Developer Mode.</li>
          <li>Click <strong>Load unpacked</strong> and select the <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">ext-dragon</code> folder, or click reload if it is already loaded.</li>
          <li>Open the sidepanel and submit a contract address.</li>
        </ol>
        <p className="mt-4 text-slate-400 italic">The module order follows the numeric folder prefix, such as 1_token_info, 2_sniper_analysis, and 5_wallet_risk.</p>
      </div>

      <div className="w-full h-px bg-emerald-400/20" />

      <div>
        <h2 className="text-xl font-bold text-emerald-300 mb-3">Create a New Module</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Copy one of the built-in module folders.</li>
          <li>Rename it with the next sequence number:
            <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
              <code>5_wallet_risk</code>
            </pre>
          </li>
          <li>Ensure your module folder contains all 5 <strong>mandatory</strong> files:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-emerald-300">
              <li><code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">module.json</code></li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">module.js</code></li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">module.css</code></li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">README.md</code></li>
              <li><code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">thumbnail.png</code></li>
            </ul>
          </li>
          <li>Run:
            <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
              <code>npm run modules:sync</code>
            </pre>
          </li>
          <li>Reload the extension and test with a contract address.</li>
        </ol>
        
        <p className="mt-4">Copied folders are allowed for quick experiments. The sync script will auto-alias duplicate module ids so the extension still loads.</p>
        <p className="mt-2">Before publishing a real new module, rename the copied module properly:</p>
        <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
          <code>{`Change the folder number/name
Change module.json id
Change module.json sequence
Change module.js metadata id/name
Change HTML ids inside module.js
Run npm run modules:sync
Reload the unpacked extension`}</code>
        </pre>
        <p className="mt-4 text-yellow-300/80">If a copied module keeps the original DOM ids, it may render but it will not behave as an independent module.</p>
        
        <p className="mt-4 font-bold">Minimum module.js:</p>
        <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400 text-xs">
          <code>{`export const metadata = {
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
export async function destroy() {}`}</code>
        </pre>
      </div>

      <div className="w-full h-px bg-emerald-400/20" />

      <div>
        <h2 className="text-xl font-bold text-emerald-300 mb-3">Zip and Share a Module</h2>
        <p className="mb-2">From inside <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">ext-dragon/modules</code>, zip the module folder:</p>
        <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
          <code>zip -r wallet_risk.zip 5_wallet_risk</code>
        </pre>
        <p className="mt-4 mb-2">Go to <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">https://alpha-dragon.ai/playground</code>, sign in, and upload:</p>
        <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
          <code>{`Module name
Thumbnail image
Brief description
Setup instructions
Data inputs
Data API names
Module zip`}</code>
        </pre>
        <p className="mt-4 text-emerald-300">Uploaded modules publish immediately as active Playground packages.</p>
      </div>

      <div className="w-full h-px bg-emerald-400/20" />

      <div>
        <h2 className="text-xl font-bold text-emerald-300 mb-3">Non-Developer Flow</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Download the Chrome extension from GitHub.</li>
          <li>Download a module zip from the custom Playground.</li>
          <li>Ask a developer or technical teammate to unzip it into <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">ext-dragon/modules/</code>.</li>
          <li>Ask them to run <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">npm run modules:sync</code>.</li>
          <li>Reload the unpacked extension in Chrome.</li>
          <li>Test the module with a contract address.</li>
          <li>If you have a module idea, sign in to the Playground and upload a draft package with setup notes.</li>
        </ol>
      </div>

      <div className="w-full h-px bg-emerald-400/20" />

      <div>
        <h2 className="text-xl font-bold text-emerald-300 mb-3">Playground Accounts</h2>
        <p>Anyone can browse and vote. The Playground uses Firebase anonymous auth for public votes so one browser identity cannot vote repeatedly on the same module.</p>
        <p className="mt-2">Uploading requires email/password auth or Google sign-in.</p>
        <p className="mt-4">Root admins are created in Firebase Auth first. Then add this Firestore document:</p>
        <pre className="mt-2 bg-slate-900 p-3 rounded-md overflow-x-auto border border-emerald-400/20 text-emerald-400">
          <code>{`admins/{uid}
  role: "root"
  createdAt: serverTimestamp()`}</code>
        </pre>
        <p className="mt-4">Root admins can disable, enable, mark deleted, restore, blacklist, and unblacklist uploaders from <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-200">/playground/admin.html</code>.</p>
      </div>

      <div className="mt-6 p-4 bg-emerald-400/10 border border-emerald-400/30 rounded-lg">
        <h3 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check h-5 w-5"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
          Important Security Rule
        </h3>
        <p className="text-emerald-100">The extension does not load or run Playground code remotely. Every module is downloaded, reviewed, copied into the local extension, synced into the generated registry, and loaded from the local unpacked extension.</p>
      </div>
    </div>
  );
};
