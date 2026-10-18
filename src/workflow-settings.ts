/** UI-authored setup only. No backend capability is implied by these choices. */
export interface WorkflowSettings {
  analysis: string;
  durationS: number;
  timeStepS: number;
  target: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  layers: string;
  finish: string;
  quantity: number;
  view: string;
}
export const defaultWorkflowSettings: WorkflowSettings = {
  analysis: "Transient",
  durationS: 2,
  timeStepS: 0.001,
  target: "ESP32",
  widthMm: 80,
  heightMm: 50,
  thicknessMm: 1.6,
  layers: "2",
  finish: "Lead-free HASL",
  quantity: 5,
  view: "Assembled",
};
