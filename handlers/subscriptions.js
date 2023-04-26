import { GLOBALS, SUBCRIPTIONS } from "../ds/conn";
import { GLOBAL_subscriptions } from "./marketplace";

const refresh_subscriptions = () => {
  setInterval(() => {
    let subscriptions = SUBCRIPTIONS.read(
      GLOBALS.readone({ global: GLOBAL_subscriptions }).subscribers
    );
  }, 60 * 60 * 24 * 1000);
};

export { refresh_subscriptions };
