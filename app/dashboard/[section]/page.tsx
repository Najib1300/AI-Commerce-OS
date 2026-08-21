import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui";
const names:Record<string,string>={"product-research":"Product Research","store-builder":"Store Builder","creative-studio":"Creative Studio",marketing:"Marketing",orders:"Orders",customers:"Customers",analytics:"Analytics","ai-manager":"AI Manager",integrations:"Integrations",billing:"Billing",settings:"Settings"};
export default async function SectionPage({params}:{params:Promise<{section:string}>}){const {section}=await params;const name=names[section];if(!name)notFound();return <div><h1 className="mb-6 text-3xl font-bold">{name}</h1><EmptyState title={`${name} is coming soon`} description="This workspace is part of a future phase. Phase 1A establishes the secure foundation it will use."/></div>}
