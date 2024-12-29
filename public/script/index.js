import observerEvent from './intersectObserver.js';
import darkTheme from './darkTheme.js';
import scrollFunc from './scroll.js';

document.addEventListener('DOMContentLoaded', () => {
    observerEvent();
    scrollFunc();
    //darkTheme();
});