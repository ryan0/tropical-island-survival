import type { SoundState } from '../audio/audio';

const TEXT: Record<SoundState, string> = {
  on: 'waves on',
  off: 'waves off',
  unavailable: 'no audio',
};

/** A tap switches the sound, and the button then says which way it is. */
export function watchSoundButton(button: HTMLElement, toggleSound: () => SoundState): void {
  button.addEventListener('click', () => {
    button.textContent = TEXT[toggleSound()];
  });
}
