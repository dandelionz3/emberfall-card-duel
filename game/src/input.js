// Input: mouse and keyboard, nothing else. One file, one job: turn clicks
// and keys into the game's verbs (play a card, end the turn, start, mute).
// The overlay re-renders, so its buttons are caught by delegation on #app.

export function createInput(app, actions) {
  app.addEventListener('click', (event) => {
    const card = event.target.closest('.card[data-index]');
    if (card) {
      actions.onPlayCard(Number(card.dataset.index));
      return;
    }
    if (event.target.closest('#end-turn-btn')) {
      actions.onEndTurn();
      return;
    }
    if (event.target.closest('#start-btn') || event.target.closest('#again-btn')) {
      actions.onStart();
      return;
    }
    if (event.target.closest('#mute-btn')) {
      actions.onMute();
      return;
    }
    if (event.target.closest('#restart-btn')) {
      actions.onRestart();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '5') {
      actions.onPlayCard(Number(event.key) - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const overlay = app.querySelector('#overlay.show');
      if (overlay) actions.onStart();
      else actions.onEndTurn();
      event.preventDefault();
      return;
    }
    if (event.key === 'm' || event.key === 'M') actions.onMute();
  });
}
