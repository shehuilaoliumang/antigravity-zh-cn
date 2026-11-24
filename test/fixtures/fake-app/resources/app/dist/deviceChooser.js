
    hid: 'HID device',
    usb: 'USB device',
    serial: 'serial port',
    label: `${d.name?.trim() || 'Unknown device'} (${hex4(d.vendorId)}:${hex4(d.productId)})`,
    label: `${d.productName ?? 'Unknown device'} (${hex4(d.vendorId)}:${hex4(d.productId)})`,
                        title: 'Connect a device',
                        detail: cancelId
                            ? 'Select a device:'
                            : 'No compatible devices found.',
                        buttons: [...snapshot.map(({ label }) => label), 'Cancel'],
