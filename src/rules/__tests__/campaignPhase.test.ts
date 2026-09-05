/**
 * The Campaign Phase Steps, and what the post-battle wizard does not say.
 *
 * The book: *"To carry out a Campaign Phase you must go through the following
 * Campaign Phase Steps in the order that they appear below"* — and then six of
 * them. The app's post-battle wizard has four, two of which ("Scavenge",
 * "Chronicle") are not names the book uses, and it omits the Reinforcements
 * and Quartermaster Steps entirely.
 *
 * The order is not decoration, which is the point of deriving it: Reinforcements
 * comes BEFORE Exploration, and taking it costs you both Exploration and the
 * Quartermaster. A four-step sequence in a different order cannot express that
 * trade at all.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';

const steps = (DATASET as unknown as {
  campaign?: { phaseSteps?: { name: string; description: string }[] };
}).campaign?.phaseSteps ?? [];

describe('the Campaign Phase Steps', () => {
  it('are the six the book prints, in its order', () => {
    expect(steps.map((s) => s.name)).toEqual([
      'Trauma Step',
      'Promotions & Experience Step',
      'Reinforcements Step (Optional)',
      'Exploration Step',
      'Quartermaster Step',
      'Roster Step',
    ]);
  });

  it('keep Reinforcements before Exploration, because the rule depends on it', () => {
    const at = (name: string) => steps.findIndex((s) => s.name.startsWith(name));
    expect(at('Reinforcements')).toBeLessThan(at('Exploration'));
    expect(at('Exploration')).toBeLessThan(at('Quartermaster'));
  });

  it('say what taking Reinforcements costs', () => {
    /*
      "if you do so you will not be able to Explore or visit the Quartermaster,
      so it is not a decision to be taken lightly". Without this sentence the
      step reads as a free option.
    */
    const reinforcements = steps.find((s) => s.name.startsWith('Reinforcements'))!;
    expect(reinforcements.description).toMatch(/not be able to Explore/i);
    expect(reinforcements.description).toMatch(/Quartermaster/i);
  });

  it('keep "(Optional)" in the name, because it is what the step is', () => {
    expect(steps.find((s) => s.name.startsWith('Reinforcements'))!.name)
      .toContain('(Optional)');
  });

  it('carry a description a player can act on, with no cross-reference arrows', () => {
    for (const s of steps) {
      expect(s.description.length, s.name).toBeGreaterThan(20);
      // The book's "(▶ see …)" points at chapters this view has no link for.
      expect(s.description, s.name).not.toMatch(/▶/);
    }
  });
});
