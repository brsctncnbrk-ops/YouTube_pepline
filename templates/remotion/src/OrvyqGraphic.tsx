import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type OrvyqGraphicSpec = {
  type: string;
  family?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  labels?: string[];
};

const ink = "#F3ECDD";
const muted = "#B9B1A1";
const red = "#D84B4B";
const amber = "#F0A45D";
const panel = "#111826";
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const familyFor = (type: string) => {
  if (["brand_open", "brand_close"].includes(type)) return "brand";
  if (["concentration", "incident_map", "systemic_risk", "monitoring"].includes(type)) return "network";
  if (["forecast", "forecast_diverge", "benchmark", "market_pressure", "overtake"].includes(type)) return "trend";
  if (["open_closed", "audit_tradeoff", "defense_balance"].includes(type)) return "split";
  if (["safeguards", "compliance_stack", "compute_threshold"].includes(type)) return "stack";
  if (["report_scan", "evaluation", "scenario", "fire_drill"].includes(type)) return "scan";
  if (type === "bio_boundary") return "boundary";
  if (type === "sunset") return "timeline";
  return "signal";
};

const Grid = () => (
  <AbsoluteFill style={{ opacity: 0.3, backgroundImage: "linear-gradient(rgba(244,236,221,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(244,236,221,.075) 1px,transparent 1px)", backgroundSize: "72px 72px", maskImage: "radial-gradient(ellipse at center,black 0%,transparent 80%)" }} />
);

const Mark = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Arial", letterSpacing: ".3em", fontSize: 22, color: ink }}>
    <span style={{ width: 12, height: 12, background: red, borderRadius: 99, boxShadow: `0 0 24px ${red}` }} />ORVYQ
  </div>
);

const Network: React.FC<{ p: number; kind: string }> = ({ p, kind }) => {
  const nodes = [[120,315,18],[270,155,13],[420,360,13],[600,205,22],[775,350,14],[935,145,14],[1100,305,18]];
  const links = [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6]];
  return <svg viewBox="0 0 1200 520" style={{ width: "100%", maxWidth: 1240 }}>
    {links.map(([a,b],i) => <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={kind === "incident_map" ? red : amber} strokeWidth={3} opacity={interpolate(p,[i*.045,.45+i*.035],[0,.72],clamp)} />)}
    {nodes.map(([x,y,r],i) => { const show=interpolate(p,[.08+i*.04,.28+i*.04],[0,1],clamp); const center=i===3; return <g key={i} opacity={show}>{center ? <circle cx={x} cy={y} r={r*(1.8+Math.sin(p*Math.PI*8)*.18)} fill="none" stroke={red} opacity={.28} strokeWidth={3}/> : null}<circle cx={x} cy={y} r={r*(.72+show*.28)} fill={center?red:panel} stroke={ink} strokeWidth={2}/></g>; })}
  </svg>;
};

const Trend: React.FC<{ p: number; kind: string }> = ({ p, kind }) => {
  const draw=interpolate(p,[.08,.8],[0,1],clamp);
  if (["benchmark","market_pressure"].includes(kind)) {
    const values=kind === "benchmark" ? [42,61,76,92] : [36,54,71,88];
    return <div style={{ width:"100%",maxWidth:1120,display:"grid",gap:24 }}>{values.map((v,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"130px 1fr 90px",alignItems:"center",gap:24}}><span style={{fontSize:20,letterSpacing:".16em",color:muted}}>MODEL {i+1}</span><div style={{height:30,background:"rgba(243,236,221,.11)",overflow:"hidden"}}><div style={{width:`${v*draw}%`,height:"100%",background:i===3?red:amber,boxShadow:i===3?`0 0 28px ${red}`:"none"}}/></div><span style={{fontSize:26,color:i===3?red:ink}}>{Math.round(v*draw)}</span></div>)}</div>;
  }
  return <svg viewBox="0 0 1200 520" style={{width:"100%",maxWidth:1240}}>
    <line x1="80" y1="430" x2="1140" y2="430" stroke="rgba(243,236,221,.42)"/><line x1="80" y1="70" x2="80" y2="430" stroke="rgba(243,236,221,.42)"/>
    {[0,1,2,3].map(i=><line key={i} x1="80" y1={120+i*78} x2="1140" y2={120+i*78} stroke="rgba(243,236,221,.08)"/>)}
    <path pathLength={1} d="M100 385 C250 350 300 330 420 285 S650 210 810 165 S1000 115 1120 84" fill="none" stroke={red} strokeWidth={8} strokeDasharray={1} strokeDashoffset={1-draw}/>
    {["forecast","forecast_diverge"].includes(kind)?<path pathLength={1} d="M100 390 C260 360 400 310 560 250 S850 220 1120 300" fill="none" stroke={amber} strokeWidth={6} strokeDasharray=".018 .024" strokeDashoffset={1-draw}/>:null}
    {kind==="overtake"?<path pathLength={1} d="M100 165 C340 190 520 245 690 290 S930 340 1120 382" fill="none" stroke={ink} strokeWidth={6} strokeDasharray={1} strokeDashoffset={1-draw} opacity={.8}/>:null}
  </svg>;
};

const Split: React.FC<{ p:number; kind:string }> = ({p,kind}) => {
  const left=kind==="open_closed"?"OPEN":kind==="defense_balance"?"ATTACK":"AUDIT";
  const right=kind==="open_closed"?"CLOSED":kind==="defense_balance"?"DEFENSE":"EXPOSURE";
  const tilt=interpolate(p,[.1,.75],[-8,kind==="defense_balance"?0:7],clamp);
  return <div style={{width:"100%",maxWidth:1120,height:360,position:"relative",display:"grid",gridTemplateColumns:"1fr 1fr",gap:34}}>{[left,right].map((label,i)=><div key={label} style={{border:`1px solid ${i?ink:amber}`,background:"rgba(8,13,24,.72)",padding:38,display:"flex",flexDirection:"column",justifyContent:"space-between",transform:`translateY(${i?tilt:-tilt}px)`}}><span style={{color:i?ink:amber,letterSpacing:".2em",fontSize:24}}>{label}</span><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10}}>{Array.from({length:18}).map((_,j)=><span key={j} style={{height:24,border:`1px solid ${muted}`,opacity:interpolate(p,[j*.018,.45+j*.01],[.12,j%3===0?.95:.48],clamp)}}/>)}</div></div>)}<div style={{position:"absolute",left:"50%",top:10,bottom:10,width:2,background:`linear-gradient(${amber},${red})`}}/></div>;
};

const Stack: React.FC<{ p:number; kind:string }> = ({p,kind}) => {
  const rows=kind==="safeguards"?["CONSTRAIN","AUDIT","REPORT","VERIFY"]:kind==="compute_threshold"?["COMPUTE","CAPABILITY","RISK","OVERSIGHT"]:["EVALUATE","REPORT","COMPLY","REVIEW"];
  return <div style={{width:"100%",maxWidth:1080,display:"grid",gap:22}}>{rows.map((row,i)=>{const show=interpolate(p,[.08+i*.1,.45+i*.09],[0,1],clamp);return <div key={row} style={{display:"grid",gridTemplateColumns:"245px 1fr",gap:24,alignItems:"center",opacity:show,transform:`translateX(${(1-show)*40}px)`}}><span style={{color:muted,letterSpacing:".14em",fontSize:22}}>{row}</span><div style={{height:30,background:"rgba(243,236,221,.12)",overflow:"hidden"}}><div style={{width:`${(42+i*14)*show}%`,height:"100%",background:i%2?amber:red}}/></div></div>})}</div>;
};

const Scan: React.FC<{ p:number; kind:string }> = ({p,kind}) => {
  const y=interpolate(p,[.06,.92],[30,455],clamp);
  const labels=kind==="fire_drill"?["TEST","SIGNAL","RESPONSE"]:kind==="scenario"?["PROMPT","CHOICE","OUTCOME"]:kind==="evaluation"?["INPUT","LIMIT","RESULT"]:["REPORT","EVIDENCE","REVIEW"];
  return <div style={{width:"100%",maxWidth:1080,height:430,position:"relative",border:"1px solid rgba(243,236,221,.24)",background:"rgba(7,12,20,.72)",padding:34,overflow:"hidden"}}><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24,height:"100%"}}>{labels.map((label,i)=>{const show=interpolate(p,[.08+i*.12,.42+i*.1],[0,1],clamp);return <div key={label} style={{border:`1px solid ${i===1?red:"rgba(243,236,221,.3)"}`,padding:24,display:"flex",flexDirection:"column",justifyContent:"space-between",opacity:show}}><span style={{color:i===1?amber:muted,letterSpacing:".16em",fontSize:20}}>{label}</span><div style={{display:"grid",gap:12}}>{[.72,.92,.55,.82].map((w,j)=><span key={j} style={{width:`${w*100*show}%`,height:12,background:j===2&&i===1?red:"rgba(243,236,221,.24)"}}/>)}</div></div>})}</div><div style={{position:"absolute",left:0,right:0,top:y,height:3,background:amber,boxShadow:`0 0 22px ${amber}`}}/></div>;
};

const Boundary: React.FC<{p:number}> = ({p}) => <div style={{width:620,height:420,position:"relative",display:"grid",placeItems:"center"}}>{[1,.76,.52,.29].map((s,i)=>{const show=interpolate(p,[.08+i*.1,.42+i*.1],[0,1],clamp);return <div key={s} style={{position:"absolute",width:600*s,height:360*s,borderRadius:"50%",border:`3px solid ${i===3?red:amber}`,opacity:show*(.35+i*.18),transform:`scale(${.82+show*.18})`}}/>})}<span style={{color:red,fontSize:28,letterSpacing:".2em"}}>BOUNDARY</span></div>;

const Timeline: React.FC<{p:number}> = ({p}) => {const draw=interpolate(p,[.08,.82],[0,1],clamp);return <div style={{width:"100%",maxWidth:1100,height:300,position:"relative"}}><div style={{position:"absolute",left:40,right:40,top:145,height:4,background:"rgba(243,236,221,.16)"}}/><div style={{position:"absolute",left:40,top:145,height:4,width:`${draw*92}%`,background:`linear-gradient(90deg,${amber},${red})`}}/>{["NOW","REVIEW","EXPIRE","REWRITE"].map((label,i)=>{const show=interpolate(p,[.12+i*.13,.32+i*.13],[0,1],clamp);return <div key={label} style={{position:"absolute",left:`${8+i*29}%`,top:105,opacity:show,textAlign:"center"}}><div style={{width:26,height:26,borderRadius:99,background:i===2?red:panel,border:`2px solid ${i===2?red:ink}`,margin:"0 auto 24px"}}/><span style={{color:i===2?amber:muted,letterSpacing:".16em",fontSize:20}}>{label}</span></div>})}</div>};

const Signal: React.FC<{p:number}> = ({p}) => <div style={{width:"100%",maxWidth:1100,height:330,display:"flex",alignItems:"center",justifyContent:"center",gap:22}}>{Array.from({length:17}).map((_,i)=><span key={i} style={{width:34,height:50+Math.abs(Math.sin(i*1.7))*240*interpolate(p,[.05,.72],[.2,1],clamp),background:i%4===0?red:amber,opacity:.35+(i%5)*.12,borderRadius:4}}/>)}</div>;

const Body: React.FC<{family:string;kind:string;p:number}> = ({family,kind,p}) => {
  if(family==="network") return <Network p={p} kind={kind}/>;
  if(family==="trend") return <Trend p={p} kind={kind}/>;
  if(family==="split") return <Split p={p} kind={kind}/>;
  if(family==="stack") return <Stack p={p} kind={kind}/>;
  if(family==="scan") return <Scan p={p} kind={kind}/>;
  if(family==="boundary") return <Boundary p={p}/>;
  if(family==="timeline") return <Timeline p={p}/>;
  return <Signal p={p}/>;
};

export const OrvyqGraphic: React.FC<{spec:OrvyqGraphicSpec;durationInFrames:number}> = ({spec,durationInFrames}) => {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const p=interpolate(frame,[0,Math.max(1,durationInFrames-1)],[0,1],clamp);
  const reveal=spring({frame,fps,config:{damping:18,stiffness:110,mass:.9},durationInFrames:Math.min(durationInFrames,32)});
  const closing=spec.type==="brand_close";
  const opening=spec.type==="brand_open";
  const family=spec.family||familyFor(spec.type);
  return <AbsoluteFill style={{background:opening||closing?"radial-gradient(circle at 50% 45%,#243A52 0%,#0B111B 44%,#05070C 100%)":"radial-gradient(circle at 72% 20%,#1B314A 0%,#0A101A 42%,#05070C 100%)",color:ink,overflow:"hidden"}}><Grid/><AbsoluteFill style={{padding:"5.2% 6.4%",justifyContent:"space-between"}}><div style={{display:"flex",justifyContent:"space-between"}}><Mark/><span style={{color:muted,fontFamily:"Arial",fontSize:16,letterSpacing:".16em"}}>{family.toUpperCase()} / ORVYQ</span></div><div style={{transform:`translateY(${(1-reveal)*36}px)`,opacity:reveal,maxWidth:opening||closing?"100%":"90%"}}><div style={{color:amber,fontFamily:"Arial",fontSize:20,letterSpacing:".2em",marginBottom:22}}>{spec.kicker||(closing?"A HUMAN QUESTION":"ORVYQ ANALYSIS")}</div><div style={{fontFamily:"Arial",fontSize:opening||closing?116:68,fontWeight:760,lineHeight:.98,letterSpacing:opening||closing?".055em":"-.025em",textTransform:opening||closing?"uppercase":"none",maxWidth:1380}}>{spec.title}</div>{spec.subtitle?<div style={{color:muted,fontFamily:"Arial",fontSize:28,lineHeight:1.34,marginTop:24,maxWidth:1020}}>{spec.subtitle}</div>:null}</div>{opening||closing?<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",opacity:.72+p*.28}}><span style={{fontFamily:"Arial",color:muted,letterSpacing:".16em",fontSize:20}}>{closing?"BEYOND THE KNOWN":"THE AI RACE NO ONE CAN AFFORD TO WIN"}</span><span style={{color:red,fontFamily:"Arial",fontSize:18,letterSpacing:".18em"}}>{closing?"ORVYQ STUDIO":"001"}</span></div>:<div style={{minHeight:330,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><Body family={family} kind={spec.type} p={p}/></div>}</AbsoluteFill><div style={{position:"absolute",left:0,right:0,bottom:0,height:8,background:"rgba(243,236,221,.12)"}}><div style={{width:`${p*100}%`,height:"100%",background:`linear-gradient(90deg,${amber},${red})`}}/></div></AbsoluteFill>;
};
