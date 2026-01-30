const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  setIsUploading(true);

  try {
    for (const file of Array.from(files)) {
      // 1. Les bildefilen som Base64-streng
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      // 2. Send direkte til din nye Cloudinary-rute
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64Data }),
      });

      if (!response.ok) throw new Error("Cloudinary-opplasting feilet");

      const result = await response.json();

      // 3. Lagre den nye Cloudinary-URL-en i skjemaet
      setUploadedImages((prev) => [...prev, result.url]);
    }

    toast({
      title: "Bilder lastet opp",
      description: `${files.length} bilde(r) ble lagret i skyen.`,
    });
  } catch (error) {
    toast({
      title: "Feil ved opplasting",
      description: "Sjekk at miljøvariabler er satt i Render.",
      variant: "destructive",
    });
  } finally {
    setIsUploading(false);
  }
};