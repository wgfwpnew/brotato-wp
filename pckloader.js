(() => {
    const nativeFetch = window.fetch.bind(window);

    const PARTS = [
        "index.pck.part00",
        "index.pck.part01",
        "index.pck.part02"
    ];

    let mergedPromise = null;

    async function buildPck() {
        if (mergedPromise)
            return mergedPromise;

        mergedPromise = (async () => {
            console.log("loading split pck");

            const buffers = [];

            for (let i = 0; i < PARTS.length; i++) {
                console.log(
                    `fetching ${PARTS[i]} (${i + 1}/${PARTS.length})`
                );

                const response = await nativeFetch(PARTS[i]);

                if (!response.ok) {
                    throw new Error(
                        `failed to fetch ${PARTS[i]}: HTTP ${response.status}`
                    );
                }

                buffers.push(await response.arrayBuffer());
            }

            const total =
                buffers.reduce((n, b) => n + b.byteLength, 0);

            console.log(
                `reconstructing ${total} bytes`
            );

            const merged = new Uint8Array(total);
            let offset = 0;

            for (const buffer of buffers) {
                merged.set(new Uint8Array(buffer), offset);
                offset += buffer.byteLength;
            }

            console.log("index.pck ready");

            return merged;
        })();

        return mergedPromise;
    }

    window.fetch = async function(input, init) {
        const url =
            typeof input === "string"
                ? input
                : input instanceof Request
                    ? input.url
                    : String(input);

        const clean =
            new URL(url, document.baseURI)
                .pathname
                .split("/")
                .pop();

        if (clean !== "index.pck")
            return nativeFetch(input, init);

        console.log("intercepted index.pck");

        const bytes = await buildPck();

        return new Response(bytes, {
            status: 200,
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": String(bytes.byteLength)
            }
        });
    };

    console.log("split loader installed");
})();
