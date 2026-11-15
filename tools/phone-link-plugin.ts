import { renderUnicodeCompact } from 'uqr';
import type { Plugin } from 'vite';

// Started with `--host`, the dev server can be opened from the phone on the home network. Its
// address is printed as a QR code as well, for the phone's camera: nothing to type.
export function phoneLink(): Plugin {
  return {
    name: 'phone-link',
    apply: 'serve',
    configureServer(server) {
      const printAddresses = server.printUrls.bind(server);
      server.printUrls = () => {
        printAddresses();
        const onTheNetwork = server.resolvedUrls?.network.at(0);
        if (onTheNetwork !== undefined) console.log(`\n${renderUnicodeCompact(onTheNetwork)}\n`);
      };
    },
  };
}
