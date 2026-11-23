import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};
const isClient = () => true;
const isServer = () => false;

export const useIsMounted = () => useSyncExternalStore(subscribeToNothing, isClient, isServer);
