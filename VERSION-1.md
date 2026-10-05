# StockPilot · Version 1.0 (5 octobre 2026)

Application de gestion de stock et de maintenance de l’usine **Tunisie Silicone**.
Adresse : https://siliconetunisie.github.io/stockpilot/

## Ce que contient la V1

### Stock
- Catégories, dossiers et sous-dossiers à plusieurs niveaux, dans n’importe quelle catégorie (moule, machine…).
- Colonnes libres par catégorie : texte, nombre, quantité, liste, photo, lien…
- Types de fiche à la création d’un article : machine, équipement, pièce de rechange, ou toutes les colonnes.
- Articles « en commun » : affichés dans chaque moule ou machine lié, stock compté une seule fois.
- Sélection multiple : déplacer vers une catégorie ou un nouveau sous-dossier, mettre en commun.
- Mouvements (entrée, sortie, ajustement), journal de stock, alertes de rupture et de stock bas.
- Tableau de bord.

### Maintenance
- Fiches d’intervention (FQ03.Ps.MNT.05) avec mentions @.
- Planning de maintenance préventive (FQ01.Ps.MNT.05) : alertes, étalonnage (FQ05), rappel quotidien.
- Check-list moule (FQ0.Ps.MNT.05), obligatoire pour clôturer une intervention sur un moule, avec historique sur la page du moule.

### Fiches de vie
- **Moules injection silicone** (dossier dédié) : BPM, BGM, Cuillère, Sucette, Tétine Large, Tétine Natural Flow, Tétine Physiologique, Tétine Souple, Embout nasal, avec identification, caractéristiques, consommables et photos.
- **Moules injection plastique** (dossier dédié) : Disque étanchéité (anti-fuite), Couvercle, Écrou, Poignée, Boîte de stérilisation.
- **Matériel** : une catégorie par équipement, chacune avec sa fiche de vie : machine d’injection TYM 45-45, système de refroidissement, four de cuisson, machine de conditionnement, machine de perçage tétine (LITOP).
- Bouton « Modifier » pour compléter chaque fiche et ajouter des photos.

### Partage et sécurité des données
- Une seule connexion Google (siliconetunisie@gmail.com), profil Maintenance ou Responsable technique sur chaque appareil.
- Données en ligne (Firebase, Europe), partagées en temps réel entre PC et téléphones.
- Synchronisation sûre : pour chaque fiche, la modification la plus récente gagne, et une fiche supprimée ne revient pas depuis un appareil qui avait une ancienne copie.
- Mise à jour automatique de l’application sur tous les appareils.
- Icône sur le téléphone, démarrage instantané, bouton retour.
- Sauvegarde : export JSON depuis Paramètres, avec rappel.

## Données enregistrées dans la V1
- Joints du moule Embout nasal (8 références, avec photos).
- Joints des pièces de rechange : joints DHS (photo), joints d’étanchéité, joints pneumatiques.
- Mold heaters (résistances moule, 7 références avec photo), en commun avec Pièces de rechange.
- Dossier « Mélangeur statique » dans la machine d’injection TYM.

## Étapes (historique)
| Date | Étape |
|---|---|
| 30 sept. – 1 oct. 2026 | Application de stock, fiches d’intervention, maintenance préventive, check-list moules, écran de démarrage |
| 1 oct. 2026 | Mise en ligne (GitHub Pages + Firebase), connexion Google, icône téléphone, bouton retour |
| 2 oct. 2026 | Joints Embout nasal, sous-catégories, sélection multiple et déplacement, articles en commun |
| 3 oct. 2026 | Joints pièces de rechange (DHS, étanchéité, pneumatiques), synchronisation sûre, mise à jour automatique |
| 5 oct. 2026 | Types de fiche, fiches de vie des moules silicone et plastique, fiches de vie du matériel, mold heaters, sous-dossiers partout |

## À compléter dans l’application
- N° de série à vérifier : Embout nasal et BGM portent le même numéro (ALM23005), tout comme la machine TYM et le système de refroidissement (161115).
- Fournisseur du moule anti-fuite, photos des équipements, gravure et poids de l’Embout nasal.

Les données vivent dans Firebase, pas sur GitHub : garder un export JSON de référence de la V1.
