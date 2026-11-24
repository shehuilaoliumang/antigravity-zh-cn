
const BUTTON_LABELS = {
    reconnect: 'Reconnect',
    stop: 'Stop Server',
    close: 'Close',
};
    const title = restarting
        ? 'Restarting…'
        : connecting
            ? 'Reconnecting…'
            : 'Disconnected';
    const heading = restarting
        ? `Restarting the Antigravity server on ${host}…`
        : connecting
            ? `Reconnecting to ${host}…`
            : `Disconnected from ${host}`;
    const body = restarting
        ? 'This window opens it again once it has started.'
        : connecting
            ? page.serverStopped
                ? `Its server on ${host} stopped, and its agents with it.`
                : `Agents keep running on ${host}.`
            : page.serverStopped
                ? `Its agents on ${host} stopped with it.`
                : `Agents keep running on ${host} unless its server stopped.`;
