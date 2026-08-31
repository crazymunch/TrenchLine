import { describe, it, expect } from 'vitest';
import { pathForView, viewForPath, rosterIdFromPath, VIEW_SEGMENTS } from '../routes';
import type { AppView } from '../../store/state';

const ALL_VIEWS = Object.keys(VIEW_SEGMENTS) as AppView[];

describe('routes', () => {
  it('round-trips every view', () => {
    // The two directions are written separately, which is how they drift: a
    // rename on one side gives a route that renders the wrong view and errors
    // nowhere.
    for (const view of ALL_VIEWS) {
      expect(viewForPath(pathForView(view)), view).toBe(view);
    }
  });

  it('covers every view in AppView, so a new one cannot be forgotten', () => {
    expect([...ALL_VIEWS].sort()).toEqual(
      ['builder', 'campaign', 'codex', 'customizer', 'directory', 'play'].sort());
  });

  it('puts a roster id in the path', () => {
    expect(pathForView('builder', 'wb-al-qarn-rihla')).toBe('/roster/wb-al-qarn-rihla');
    expect(rosterIdFromPath('/roster/wb-al-qarn-rihla')).toBe('wb-al-qarn-rihla');
  });

  it('survives an id that needs encoding', () => {
    const id = 'wb spaces';
    const path = pathForView('builder', id);
    expect(path).not.toContain(' ');
    expect(rosterIdFromPath(path)).toBe(id);
  });

  it('has no roster id on the other views', () => {
    expect(rosterIdFromPath('/play')).toBeNull();
    expect(rosterIdFromPath('/roster')).toBeNull();
    expect(rosterIdFromPath('/')).toBeNull();
  });

  it('ignores a roster id on a view that has none', () => {
    expect(pathForView('play', 'wb-1')).toBe('/play');
  });

  it('falls back to the roster for a path it does not know', () => {
    // A URL is user input. A stale or mistyped link should land on the app's
    // front door, not a blank screen.
    expect(viewForPath('/nonsense')).toBe('builder');
    expect(viewForPath('/')).toBe('builder');
    expect(viewForPath('')).toBe('builder');
  });

  it('reads the view from a deeper path', () => {
    expect(viewForPath('/roster/wb-al-qarn-rihla')).toBe('builder');
  });
});
