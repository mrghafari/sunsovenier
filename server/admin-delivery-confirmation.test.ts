import test from "node:test";
import assert from "node:assert/strict";
import {canAdminConfirmDelivery,isSiteAdminDeliveryRole,isFourDigitDeliveryCode,normalizeDeliveryConfirmationCode}
  from "../shared/admin-delivery-confirmation";

test("site administrators include the known legacy super-admin spelling, not courier roles",()=>{
  for(const role of ["admin","Super Admin"," Supper Admin ","super-admin"])assert.equal(isSiteAdminDeliveryRole(role),true);
  for(const role of ["courier","logistics_manager","custom_admin","administrator",null,{}])assert.equal(isSiteAdminDeliveryRole(role),false);
});
test("an assigned vehicle enables direct administrator delivery confirmation",()=>{
  assert.equal(canAdminConfirmDelivery({currentStatus:"logistics_assigned",vehiclePlate:"ABC-123"}),true);
  for(const vehiclePlate of [null,undefined,"","  "])
    assert.equal(canAdminConfirmDelivery({currentStatus:"logistics_assigned",vehiclePlate}),false);
});
test("existing dispatched-order confirmation remains available",()=>{
  assert.equal(canAdminConfirmDelivery({currentStatus:"logistics_dispatched"}),true);
});
test("verified, completed, cancelled, failed and not-yet-assigned orders cannot be confirmed",()=>{
  for(const currentStatus of ["logistics_pending","warehouse_approved","delivered","logistics_delivered","completed","cancelled","failed","financial_rejected"])
    assert.equal(canAdminConfirmDelivery({currentStatus,vehiclePlate:"ABC-123"}),false);
  for(const currentStatus of ["logistics_assigned","logistics_dispatched"])
    assert.equal(canAdminConfirmDelivery({currentStatus,vehiclePlate:"ABC-123",isVerified:true}),false);
});
test("confirmation accepts exactly four English, Persian or Arabic digits without stripping invalid text",()=>{
  for(const code of ["1234"," ۱۲۳۴ ","١٢٣٤","0001"])assert.equal(isFourDigitDeliveryCode(code),true);
  assert.equal(normalizeDeliveryConfirmationCode(" ۱۲٣4 "),"1234");
  for(const code of ["","123","12345","12x4","1 234","12.4",1234,null,{}])assert.equal(isFourDigitDeliveryCode(code),false);
});
