import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import bundledCompanyLogo from "@assets/company-logo.png";

export default function CompanyBrandLogo(){
  const {data}=useQuery<{success?:boolean;data?:{logoUrl?:string|null}|null}>({
    queryKey:["/api/company-information"],
    staleTime:10*60*1000,
    retry:1,
  });
  const configured=data?.data?.logoUrl?.trim();
  const [failedUrl,setFailedUrl]=useState<string|null>(null);
  const source=configured&&configured!==failedUrl?configured:bundledCompanyLogo;
  return <img className="mc-brand-logo" src={source} alt="Momtazchem" width={40} height={40}
    onError={()=>{if(source!==bundledCompanyLogo)setFailedUrl(source);}} />;
}
