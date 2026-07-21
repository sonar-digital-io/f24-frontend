export interface Profile {
  id: string;
  name: string;
  position: number; // relative radius, 0..1
  type: string;
  maxCamber: number; // %
  maxCamberPosition: number;
  thickness: number; // %
  show2D: boolean;
}

export const PROFILE_TYPES = ['NACA 4 digit', 'NACA 5 digit', 'Custom airfoil'];

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'p0',
    name: 'Profile1',
    position: 0.05,
    type: 'NACA 4 digit',
    maxCamber: 4,
    maxCamberPosition: 40,
    thickness: 12,
    show2D: true,
  },
  {
    id: 'p1',
    name: 'Profile2',
    position: 0.15,
    type: 'NACA 4 digit',
    maxCamber: 10,
    maxCamberPosition: 18.431236,
    thickness: 19.681555,
    show2D: true,
  },
  {
    id: 'p2',
    name: 'Profile3',
    position: 0.3,
    type: 'NACA 4 digit',
    maxCamber: 8,
    maxCamberPosition: 30,
    thickness: 17,
    show2D: true,
  },
  {
    id: 'p3',
    name: 'Profile4',
    position: 0.55,
    type: 'NACA 4 digit',
    maxCamber: 6,
    maxCamberPosition: 40,
    thickness: 15,
    show2D: true,
  },
  {
    id: 'p4',
    name: 'Profile5',
    position: 0.8,
    type: 'NACA 4 digit',
    maxCamber: 4,
    maxCamberPosition: 50,
    thickness: 12,
    show2D: true,
  },
  {
    id: 'p5',
    name: 'Profile6',
    position: 1,
    type: 'NACA 4 digit',
    maxCamber: 2,
    maxCamberPosition: 50,
    thickness: 9,
    show2D: true,
  },
];
