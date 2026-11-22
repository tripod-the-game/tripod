import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HowToPlayComponent } from './how-to-play.component';

const SOLUTION: Record<number, string> = {
  1: 'A', 2: 'V', 3: 'P', 4: 'A', 5: 'P', 6: 'U',
  7: 'L', 8: 'G', 9: 'R', 10: 'A', 11: 'P', 12: 'E',
};

describe('HowToPlayComponent difficulty content', () => {
  let component: HowToPlayComponent;
  let fixture: ComponentFixture<HowToPlayComponent>;
  let host: HTMLElement;

  // The triangle updates state during its own lifecycle hooks (see MEMORY.md, NG0100),
  // so these tests render without the dev-mode second pass.
  const render = async (): Promise<void> => {
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);
  };

  const text = (el: Element | null): string =>
    (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const difficultySection = (): HTMLElement | null =>
    Array.from(host.querySelectorAll<HTMLElement>('section')).find(
      s => text(s.querySelector('h2')) === 'Difficulty',
    ) ?? null;

  const modeLine = (mode: string): string => {
    const items = Array.from(difficultySection()?.querySelectorAll('li') ?? []);
    return text(items.find(li => text(li.querySelector('strong')) === mode) ?? null);
  };

  const inputs = (): HTMLInputElement[] =>
    Array.from(host.querySelectorAll<HTMLInputElement>('.tutorial-triangle input'));

  const typeLetters = async (letters: Record<number, string>): Promise<void> => {
    const fields = inputs();
    for (const [position, letter] of Object.entries(letters)) {
      const field = fields[Number(position) - 1];
      field.value = letter;
      field.dispatchEvent(new Event('input'));
    }
    await render();
  };

  const click = async (selector: string): Promise<void> => {
    host.querySelector<HTMLButtonElement>(selector)!.click();
    await render();
  };

  const goToStepTwo = async (): Promise<void> => {
    await click('.nav-btn.primary');
  };

  const expectNoDifficultyUi = (): void => {
    const body = host.querySelector('.try-it-body')!;
    expect(text(body)).not.toMatch(/\b(easy|medium|hard|difficulty)\b/i);
    expect(body.querySelector('[class*="difficulty"], [class*="picker"]')).toBeNull();
    expect(body.querySelector('[role="radio"], [role="radiogroup"], select')).toBeNull();
    expect(body.querySelector('.locked, [class*="locked"]')).toBeNull();
    expect(body.querySelector('[aria-label*="locked" i]')).toBeNull();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowToPlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HowToPlayComponent);
    component = fixture.componentInstance;
    host = fixture.nativeElement;
    await render();
  });

  afterEach(() => fixture.destroy());

  describe('step 1', () => {
    it('shows a Difficulty section', () => {
      expect(component.step).toBe(1);
      expect(difficultySection()).not.toBeNull();
    });

    it('explains what each mode reveals', () => {
      expect(modeLine('Hard')).toMatch(/no letters revealed/i);
      expect(modeLine('Medium')).toMatch(/reveals the bottom-left corner/i);
      expect(modeLine('Medium')).not.toMatch(/top/i);
      expect(modeLine('Easy')).toMatch(/reveals the bottom-left and top corners/i);
    });

    it('says revealed corners do not use hints', () => {
      expect(text(difficultySection())).toMatch(/revealed corners don't use hints/i);
    });

    it('explains the move-easier rule', () => {
      expect(text(difficultySection())).toMatch(
        /only move to an easier mode, and only before your first submission/i,
      );
    });

    it('says wins in every mode count toward stats', () => {
      expect(text(difficultySection())).toMatch(/wins in every mode count toward your stats/i);
    });
  });

  describe('step 2', () => {
    beforeEach(goToStepTwo);

    it('has no Difficulty section, picker, or locked circles', () => {
      expect(component.step).toBe(2);
      expect(difficultySection()).toBeNull();
      expectNoDifficultyUi();
    });

    it('starts with 12 empty, editable circles', () => {
      const fields = inputs();
      expect(fields.length).toBe(12);
      expect(fields.every(f => f.value === '' && !f.disabled)).toBeTrue();
    });

    it('still solves GUAVA / APPLE / GRAPE', async () => {
      await typeLetters(SOLUTION);
      await click('.check-btn');

      expect(component.tutorialSolved).toBeTrue();
      expect(text(host.querySelector('.solved-banner'))).toContain('You got it!');
      expect(host.querySelectorAll('.tutorial-triangle .circle-input.correct').length).toBe(12);
      expect(host.querySelector('.tutorial-actions')).toBeNull();
      expectNoDifficultyUi();
    });

    it('does not solve on a partial answer, and Reset clears it', async () => {
      await typeLetters({ 1: 'A', 8: 'G' });
      await click('.check-btn');

      expect(component.tutorialSolved).toBeFalse();
      expect(host.querySelector('.solved-banner')).toBeNull();
      expect(host.querySelectorAll('.tutorial-triangle .circle-input.correct').length).toBe(2);

      await click('.reset-tutorial-btn');

      expect(component.tutorialCorrect).toEqual({});
      expect(host.querySelectorAll('.tutorial-triangle .circle-input.correct').length).toBe(0);
      expect(inputs().every(f => f.value === '' && !f.disabled)).toBeTrue();
    });
  });
});
