import { showBuildLabel } from './ui/build-label';

showBuildLabel(document.body, {
  version: import.meta.env.BUILD_VERSION,
  commit: import.meta.env.BUILD_COMMIT,
});
