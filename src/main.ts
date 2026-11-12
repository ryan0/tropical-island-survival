import { showBuildLabel } from './ui/build-label';
// Build 78's program, one module for each of its files. Each imports the one before it first,
// so importing the last runs them all in build 78's order.
import './lifted/js/90_main.js';

showBuildLabel(document.body, {
  version: import.meta.env.BUILD_VERSION,
  commit: import.meta.env.BUILD_COMMIT,
});
