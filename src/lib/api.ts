export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'EcoQuest');

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as {error?: string}).error || `A kérés sikertelen (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

/**
 * Resizes an uploaded image client-side to max 1280px on longest edge
 * so mobile camera photos stay crisp while staying well below upload & AI token budgets.
 */
export function compressImageToDataUrl(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Kérjük, JPEG, PNG vagy WebP formátumú képet válassz.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Az eredeti fájl túl nagy (tömörítés előtt legfeljebb 12 MB lehet).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nem sikerült beolvasni a kiválasztott képfájlt.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Nem támogatott vagy sérült képfájl.'));
      img.onload = () => {
        let {width, height} = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Nem sikerült inicializálni a képvásznat.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outputMime, quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatQuestTypeLabel(type: string): string {
  switch (type) {
    case 'daily':
      return 'Napi';
    case 'weekly':
      return 'Heti';
    case 'one_time':
      return 'Egyszeri';
    case 'special':
      return 'Különleges esemény';
    default:
      return type;
  }
}

export function formatDifficultyLabel(diff: string): string {
  switch (diff) {
    case 'easy':
      return 'Könnyű';
    case 'medium':
      return 'Közepes';
    case 'hard':
      return 'Nehéz';
    case 'epic':
      return 'Epikus';
    default:
      return diff.charAt(0).toUpperCase() + diff.slice(1);
  }
}

export function formatCategoryLabel(category: string): string {
  switch (category) {
    case 'Energy Saving':
      return 'Energia-takarékosság';
    case 'Water Conservation':
      return 'Vízmegőrzés';
    case 'Recycling':
      return 'Újrahasznosítás';
    case 'Sustainable Transport':
      return 'Fenntartható közlekedés';
    case 'Digital Sustainability':
      return 'Digitális fenntarthatóság';
    case 'Responsible Consumption':
      return 'Felelős fogyasztás';
    case 'General Eco Habits':
      return 'Általános öko-szokások';
    default:
      return category;
  }
}
