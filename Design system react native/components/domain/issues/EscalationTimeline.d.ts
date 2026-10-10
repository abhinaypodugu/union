import { ReactNode } from 'react';
export interface EscalationStage {
  /** Committee at this level, e.g. "Hyderabad IT Workers Committee" */
  name: string;
  state: 'done' | 'current' | 'upcoming' | 'skipped';
  /** Node label for non-done stages, default index+1 (e.g. "L2") */
  levelShort?: string;
  /** Secondary line: level · deadline policy · handler */
  sub?: ReactNode;
  /** True when the case arrived at this (current) stage by escalation — violet treatment */
  escalatedHere?: boolean;
  reason?: ReactNode;
  due?: string;
  dueState?: 'ok' | 'soon' | 'overdue';
  events?: Array<{ time: string; text: ReactNode }>;
}
/**
 * Vertical escalation chain with per-stage deadlines, reasons and case events.
 * @startingPoint section="Issues" subtitle="Escalation chain local → state → national" viewport="460x420"
 */
export interface EscalationTimelineProps { stages: EscalationStage[]; }
export declare function EscalationTimeline(props: EscalationTimelineProps): JSX.Element;
