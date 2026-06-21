export interface PlaygroundModule {
  id: string
  name: string
  slug: string
  sequence: number
  description: string
  setupInstructions: string
  dataInputs: string[]
  dataApis: string[]
  thumbnailUrl: string
  packageUrl: string
  uploaderEmail: string
  uploaderUid?: string
  status: "active" | "disabled" | "deleted"
  upvotes: number
  downvotes: number
  isDefault?: boolean
}

export const defaultPlaygroundModules: PlaygroundModule[] = [
  {
    id: "builtin_token_info",
    name: "Token Info",
    slug: "token-info",
    sequence: 1,
    description:
      "Token identity, market cap, token age, holders, security checks, and social/platform links.",
    setupInstructions:
      "Unzip 1_token_info into ext-dragon/modules, run npm run modules:sync, and reload the unpacked extension.",
    dataInputs: ["contractAddress", "backendReport"],
    dataApis: ["uid/check", "uid/set", "fetchData", "contract/check-update", "coin-image"],
    thumbnailUrl: "/playground/thumbnails/1_token_info.png",
    packageUrl: "/playground/default-packages/1_token_info.zip",
    uploaderEmail: "Alpha Dragon core",
    status: "active",
    upvotes: 0,
    downvotes: 0,
    isDefault: true,
  },
  {
    id: "builtin_sniper_analysis",
    name: "Sniper Analysis",
    slug: "sniper-analysis",
    sequence: 2,
    description:
      "Sniper timing chart, active sniper count, and active percentage from launch-phase buyers.",
    setupInstructions:
      "Unzip 2_sniper_analysis into ext-dragon/modules, run npm run modules:sync, and reload the unpacked extension.",
    dataInputs: ["contractAddress", "backendReport"],
    dataApis: ["fetchData"],
    thumbnailUrl: "/playground/thumbnails/1_token_info.png",
    packageUrl: "/playground/default-packages/2_sniper_analysis.zip",
    uploaderEmail: "Alpha Dragon core",
    status: "active",
    upvotes: 0,
    downvotes: 0,
    isDefault: true,
  },
  {
    id: "builtin_holder_analysis",
    name: "Holder Analysis",
    slug: "holder-analysis",
    sequence: 3,
    description: "Cluster concentration, top holder distribution, and carousel controls for holder views.",
    setupInstructions:
      "Unzip 3_holder_analysis into ext-dragon/modules, run npm run modules:sync, and reload the unpacked extension.",
    dataInputs: ["contractAddress", "backendReport"],
    dataApis: ["fetchData"],
    thumbnailUrl: "/playground/thumbnails/3_holder_analysis.png",
    packageUrl: "/playground/default-packages/3_holder_analysis.zip",
    uploaderEmail: "Alpha Dragon core",
    status: "active",
    upvotes: 0,
    downvotes: 0,
    isDefault: true,
  },
  {
    id: "builtin_bundle_analysis",
    name: "Bundle Analysis",
    slug: "bundle-analysis",
    sequence: 4,
    description:
      "Coordinated supply bundle chart, empty-state message, active bundle count, and held percentage.",
    setupInstructions:
      "Unzip 4_bundle_analysis into ext-dragon/modules, run npm run modules:sync, and reload the unpacked extension.",
    dataInputs: ["contractAddress", "backendReport"],
    dataApis: ["fetchData"],
    thumbnailUrl: "/playground/thumbnails/1_token_info.png",
    packageUrl: "/playground/default-packages/4_bundle_analysis.zip",
    uploaderEmail: "Alpha Dragon core",
    status: "active",
    upvotes: 0,
    downvotes: 0,
    isDefault: true,
  },
]
