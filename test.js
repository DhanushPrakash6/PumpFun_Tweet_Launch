async function testPumpPortalAPI() {
  try {
    const imgUrl = "https://pbs.twimg.com/profile_images/742385672682512384/VfTAuqLg_normal.jpg";
    const firstResponse = await fetch("https://pump.fun/api/ipfs-presign");
    if (!firstResponse.ok) throw new Error(`Presign (1) failed: ${firstResponse.status}`);
    const firstData = await firstResponse.json();
    const uploadsPinata = firstData.data;
    console.log("Presigned upload URL:", uploadsPinata);

    const secondResponse = await fetch(uploadsPinata, { method: "OPTIONS" });
    if (![200, 204].includes(secondResponse.status))
      throw new Error(`Preflight (2) failed: ${secondResponse.status}`);
    console.log("Preflight success:", secondResponse.statusText);

    const imageResponse = await fetch(imgUrl);
    const blob = await imageResponse.blob();

    const formData = new FormData();
    formData.append("file", blob, "download.jpg");
    formData.append("network", "public");
    formData.append("name", "download.jpg");

    const thirdResponse = await fetch(uploadsPinata, { method: "POST", body: formData });
    if (!thirdResponse.ok) throw new Error(`Image upload (3) failed: ${thirdResponse.status}`);
    const thirdData = await thirdResponse.json();
    console.log("Image uploaded:", thirdData);

    const fourthResponse = await fetch("https://pump.fun/api/ipfs-presign");
    if (!fourthResponse.ok) throw new Error(`Presign (4) failed: ${fourthResponse.status}`);
    const fourthData = await fourthResponse.json();
    const metadataUploadUrl = fourthData.data;
    console.log("Presigned metadata URL:", metadataUploadUrl);

    const fifthResponse = await fetch(metadataUploadUrl, { method: "OPTIONS" });
    if (![200, 204].includes(fifthResponse.status))
      throw new Error(`Preflight (5) failed: ${fifthResponse.status}`);
    console.log("Preflight success for metadata:", fifthResponse.statusText);

    const metadata = {
      name: "Test NFT",
      description: "This is a test NFT",
      image: `https://ipfs.io/ipfs/${thirdData.cid}`,
      showName: true,
      createdOn: "https://pump.fun"
    };
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    const metadataFormData = new FormData();
    metadataFormData.append("file", metadataBlob, "metadata.json");
    metadataFormData.append("network", "public");
    metadataFormData.append("name", "metadata.json");

    const sixthResponse = await fetch(metadataUploadUrl, { method: "POST", body: metadataFormData });
    if (!sixthResponse.ok) throw new Error(`Metadata upload (6) failed: ${sixthResponse.status}`);
    const sixthData = await sixthResponse.json();
    console.log("Metadata uploaded:", sixthData);

    const metadata2 = {
      captchaToken: "",
      description: "This is a test NFT",
      image: `https://ipfs.io/ipfs/${thirdData.cid}`,
      metadataUri: `https://ipfs.io/ipfs/${sixthData.cid}`,
      name: "Test NFT",
      showName: true,
      telegram: "",
      ticker: "NFT",
      twitter: "",
      vanityKeyCaptchaToken: "",
      website: ""
    };

    const seventhResponse = await fetch("https://frontend-api-v3.pump.fun/coins/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata2)
    });

    if (!seventhResponse.ok) {
        const errText = await seventhResponse.text();
        throw new Error(
            `Coin create (7) failed: ${seventhResponse.status} ${seventhResponse.statusText}`
        );
    }

    const seventhData = await seventhResponse.json();
    console.log("Coin created successfully:", seventhData);

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testPumpPortalAPI();