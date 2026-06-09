import { AdminPage } from "@/components/admin-page"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin | Alpha Dragon",
  description: "Playground Administration",
  robots: "noindex, nofollow",
}

export default function PlaygroundAdmin() {
  return <AdminPage />
}
