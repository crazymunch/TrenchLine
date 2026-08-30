/**
 * The mobile-first primitives (Phase 3.1).
 *
 * Everything in here owns a rule from docs/MOBILE.md so that the rule is
 * enforced once rather than re-decided per component:
 *
 *   Sheet      scroll lock, focus trap, Escape, dvh, safe areas   (§1, §2, §7)
 *   Field      16px inputs, 44px controls, bound labels           (§3, §4)
 *   Stepper    44px tap targets on the most-used control          (§3)
 *   DataTable  wide content scrolls itself, never the page        (§6)
 */
export { Sheet, type SheetProps } from './Sheet';
export { Field, Input, Select, Textarea } from './Field';
export { Stepper } from './Stepper';
export { DataTable, type Column } from './DataTable';
