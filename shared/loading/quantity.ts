const scale=100000000n;
export function quantity(value:string):bigint{
  if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,21})([.][0-9]{1,8})?$/.test(value))throw new Error("An exact nonnegative kg quantity with up to eight decimal places is required");
  const [whole,fraction=""]=value.split(".");
  return BigInt(whole)*scale+BigInt(fraction.padEnd(8,"0"));
}
export function quantityText(value:bigint):string{
  if(value<0n)throw new Error("Negative quantity");
  const fraction=(value%scale).toString().padStart(8,"0").replace(/0+$/,"");
  return (value/scale).toString()+(fraction?`.${fraction}`:"");
}
export function withinPercent(actual:string,expected:string,percent:string):boolean{
  const a=quantity(actual),e=quantity(expected),p=quantity(percent);
  if(e<=0n||p>100n*scale)return false;
  const difference=a>e?a-e:e-a;
  return difference*100n*scale<=e*p;
}