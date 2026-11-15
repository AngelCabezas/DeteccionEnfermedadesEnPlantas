import { CROPS, CROP_LIST } from './crops';

describe('Catálogo de cultivos', () => {
  it('expone los tres cultivos en el mismo orden que el catálogo', () => {
    expect(CROP_LIST.map((c) => c.id)).toEqual(['banana', 'arroz', 'cafe']);
  });

  it('cada cultivo tiene endpoint, imagen y al menos una enfermedad detectable', () => {
    for (const crop of CROP_LIST) {
      expect(crop.endpoint).toMatch(/^\/[a-z]+-disease$/);
      expect(crop.image).toMatch(/^\/img\/.+\.webp$/);
      expect(crop.detects.length).toBeGreaterThan(1);
      expect(crop.photoTips.length).toBeGreaterThan(0);
    }
  });

  it('el id coincide con la clave del catálogo (se usa como ruta)', () => {
    for (const [key, crop] of Object.entries(CROPS)) {
      expect(crop.id).toBe(key);
    }
  });
});
