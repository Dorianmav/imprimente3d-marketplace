export type Localisation = {
  numero: string;
  rue: string;
  ville: string;
  codePostal: string;
};

export type UserType = {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  avatar: string;
  password: string;
  localisation: Localisation | null;
  addressFacturation: string;
  typeCompte: string;
};
