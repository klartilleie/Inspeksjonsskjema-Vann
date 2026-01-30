const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  setIsUploading(true);

  try {
    for (const file of Array.from(files)) {
      // 1. Konverter bildet til Base64-streng
      const reader = new FileReader();

      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      // 2. Send til vår nye Cloudinary-rute
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64Data }),
      });

      if (!response.ok) throw new Error("Cloudinary upload failed");

      const result = await response.json();

      // 3. Lagre URL-en fra Cloudinary i listen over bilder
      setUploadedImages((prev) => [...prev, result.url]);
    }

    toast({
      title: "Bilder lastet opp",
      description: `${files.length} bilde(r) ble lagret i Cloudinary.`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    toast({
      title: "Feil ved opplasting",
      description: "Kunne ikke laste opp til Cloudinary. Sjekk API-nøkler i Render.",
      variant: "destructive",
    });
  } finally {
    setIsUploading(false);
  }
};