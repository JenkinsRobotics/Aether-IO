import {type ApplicationUpdate} from '@aether/ui';
function CircuitStudy({board=false}:{board?:boolean}) {
 return <svg viewBox="0 0 180 220" width="100%" height="100%" aria-hidden="true">
  <rect x="23" y="42" width="134" height="136" rx="12" fill={board?'#344a65':'#315e58'}/>
  {[0,1,2].map(i=><path key={i} d={`M36 ${64+i*42}h22v18h63v-20h24`} stroke="#b4d3aa" strokeWidth="3" fill="none"/>)}
  <rect x="66" y="87" width="46" height="44" rx="4" fill="#243439" stroke="#e8ca8f" strokeWidth="3"/>
  {[55,164].map(y=><circle key={y} cx="36" cy={y} r="4" fill="#efd398"/>)}
 </svg>;
}
export const IO_UPDATES:ApplicationUpdate[]=[
 {id:'circuits',title:'Connect your ideas',description:'Place components, draw wires and save your circuit in the early Aether IO editor.',status:'Preview',color:'#a8cbbc',artwork:<CircuitStudy/>},
 {id:'simulation',title:'Test before you build',description:'Circuit simulation is planned. The current interface is not connected to a circuit solver.',status:'Planned',color:'#b9c9e6',artwork:<CircuitStudy board/>},
 {id:'fabrication',title:'From board to build',description:'Fabrication and assembly exports are planned as board and footprint support develops.',status:'Planned',color:'#e7c395',artwork:<CircuitStudy board/>},
];
