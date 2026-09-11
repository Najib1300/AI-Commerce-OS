"use client";
import { useFormStatus } from "react-dom";
import { Button,Dropdown,Input } from "@/components/ui";
import { startProductResearch } from "@/lib/actions/product-research";
import type { Business } from "@/types/database";

function SubmitButton(){const {pending}=useFormStatus();return <Button type="submit" disabled={pending} className="mt-2">{pending?"Researching products…":"Find Products"}</Button>}

export function ProductResearchForm({businesses,selectedBusinessId}:{businesses:Business[];selectedBusinessId?:string}){
  const selected=businesses.find(item=>item.id===selectedBusinessId)??businesses[0];
  return <form action={startProductResearch} className="grid gap-5">
    <label className="grid gap-2 text-sm font-medium">Business<Dropdown name="businessId" defaultValue={selected?.id} required>{businesses.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</Dropdown></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Target country<Input name="targetCountry" defaultValue={selected?.target_country} required/></label><label className="grid gap-2 text-sm font-medium">Target selling market<Input name="targetMarket" defaultValue={selected?.target_market} required/></label></div>
    <label className="grid gap-2 text-sm font-medium">Niche<Input name="niche" defaultValue={selected?.niche} required/></label>
    <div className="grid gap-5 sm:grid-cols-3"><label className="grid gap-2 text-sm font-medium">Budget<Input name="budget" type="number" min="0" step="0.01" defaultValue={selected?.starting_budget} required/></label><label className="grid gap-2 text-sm font-medium">Maximum supplier cost<Input name="maximumSupplierCost" type="number" min="0.01" step="0.01" required/></label><label className="grid gap-2 text-sm font-medium">Preferred selling price<Input name="preferredSellingPrice" type="number" min="0.01" step="0.01" required/></label></div>
    <label className="grid gap-2 text-sm font-medium">Number of results<Dropdown name="productCount" defaultValue="5">{Array.from({length:10},(_,index)=>index+1).map(count=><option key={count} value={count}>{count}</option>)}</Dropdown></label>
    <p className="text-xs text-muted">Demand, competition, trends, costs, and risks are AI-generated estimates—not verified live market data.</p>
    <SubmitButton/>
  </form>;
}
