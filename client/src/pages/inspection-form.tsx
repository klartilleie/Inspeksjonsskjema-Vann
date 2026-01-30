const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  setIsUploading(true);

  try {
    for (const file of Array.from(files)) {
      // Vi må lese bildet som en Base64-streng for Cloudinary
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      // Her sender vi bildet til din nye /api/upload rute
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64Data }),
      });

      if (!response.ok) throw new Error("Cloudinary feilet");

      const result = await response.json();

      // result.url er den direkte lenken til bildet i Cloudinary
      setUploadedImages((prev) => [...prev, result.url]);
    }

    toast({
      title: "Bilder lastet opp",
      description: `${files.length} bilde(r) ble lagret i Cloudinary.`,
    });
  } catch (error) {
    toast({
      title: "Feil ved opplasting",
      description: "Sjekk at Cloudinary-nøklene ligger inne i Render Settings.",
      variant: "destructive",
    });
  } finally {
    setIsUploading(false);
  }
};