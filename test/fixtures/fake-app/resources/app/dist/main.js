
            await electron_1.dialog.showErrorBox('Binary not found', msg);
                title: 'WSL distro not found',
                message: `The WSL distro "${WSL_DISTRO}" is no longer installed.`,
                detail: 'Antigravity opened on Windows instead.',
            await electron_1.dialog.showErrorBox('WSL setup failed', msg);
            await electron_1.dialog.showErrorBox('Startup failed', msg);
                    label: 'New Window',
                label: 'No agents running',
                label: `Open ${electron_1.app.getName()}`,
                label: 'Quit',
        buttons: ['Cancel', 'Quit'],
        title: 'Confirm Quit',
        message: 'Are you sure you want to quit?',
        detail: 'There may be agents or background tasks running.',
