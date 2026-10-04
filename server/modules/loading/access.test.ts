import {test,after} from "node:test";
import assert from "node:assert/strict";
import type {Request} from "express";
import {pool} from "../../db";
import {resolveLoadingFoundationAccess} from "./access";
const request=(session:unknown)=>({session} as Request);
test("missing and unauthenticated sessions cannot read foundation",async()=>{
 for(const s of [undefined,{}, {adminId:1},{isAuthenticated:false,adminId:1}])
  await assert.rejects(()=>resolveLoadingFoundationAccess(request(s)),{status:401,code:"AUTH_REQUIRED"});
});
test("ambiguous management identities are rejected before role lookup",async()=>{
 await assert.rejects(()=>resolveLoadingFoundationAccess(request({isAuthenticated:true,adminId:1,customUserId:2})),{status:401});
 await assert.rejects(()=>resolveLoadingFoundationAccess(request({isAuthenticated:true})),{status:401});
});
test("invalid identities cannot become management actors",async()=>{
 for(const adminId of ["bogus",-1,1.2,Number.MAX_SAFE_INTEGER+1]){
  await assert.rejects(()=>resolveLoadingFoundationAccess(request({isAuthenticated:true,adminId})),{status:401});
 }
});
test("customer authentication does not confer staff foundation access",async()=>{
 await assert.rejects(()=>resolveLoadingFoundationAccess(request({isAuthenticated:true,customerId:1})),{status:401});
});
after(async()=>{await pool.end();});