import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccountingShipmentCostCapture from "./accounting-shipment-cost-capture";
import { shipmentCostCaptureText } from "./accounting-shipment-cost-capture-copy";

function render(canManage:boolean) {
  const values:Record<string,string> = { "language-manually-selected":"true", language:"en" };
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{
    getItem:(key:string)=>values[key]??null,
    setItem:(key:string,value:string)=>{values[key]=value;},
    removeItem:(key:string)=>{delete values[key];},
  }});
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  const html = renderToStaticMarkup(<LanguageProvider><QueryClientProvider client={client}>
    <AccountingShipmentCostCapture companyId={42} companyName="Tigris Polymers" canManage={canManage}/>
  </QueryClientProvider></LanguageProvider>);
  client.clear();
  return html;
}

test("documentary capture SSR renders manager-only immutable, capture-only form",()=>{
  const html = render(true);
  assert.match(html,/Capture documented shipment cost/);
  assert.match(html,/Tigris Polymers/);
  assert.match(html,/Cost type/);
  assert.match(html,/Original loading reference/);
  assert.match(html,/does not create a journal, stock movement, wallet transaction/i);
  assert.match(html,/value=""/);
  assert.match(shipmentCostCaptureText("en","actualCost"),/Actual cost/);
  assert.match(shipmentCostCaptureText("en","distance"),/Actual distance/);
});

test("documentary capture form is not rendered for viewers and its safety copy covers four locales",()=>{
  const viewer = render(false);
  assert.match(viewer,/available to accounting managers only/i);
  assert.doesNotMatch(viewer,/<form/);
  for (const language of ["en","fa","ar","tr"]) {
    assert.match(shipmentCostCaptureText(language,"confirmText"),/./);
    assert.match(shipmentCostCaptureText(language,"loadingHelp"),/./);
  }
});
