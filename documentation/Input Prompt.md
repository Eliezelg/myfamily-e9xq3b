```
# Cahier des Charges - MyFamily
## Plateforme de liaison intergénérationnelle

### Table des matières
1. Présentation du Projet
2. Spécifications Fonctionnelles
3. Spécifications Techniques
4. Processus de Production
5. Modèle Économique et Facturation
6. Gestion de Projet
7. Sécurité et Conformité
8. Évolutions Futures

### 1. Présentation du Projet

#### 1.1 Contexte
C’est une plateforme qui permet aux familles de partager des nouvelles et des photos de manière simple et conviviale avec leurs proches, notamment les grands-parents ou des personnes âgées qui ne sont pas toujours à l’aise avec la technologie.
Comment ça fonctionne ?
1.	Application mobile ou web pour la famille :
o	Les membres de la famille utilisent l'application Myfamily pour publier des messages ou des photos, un peu comme sur un réseau social privé.
o	Ces publications sont visibles uniquement par les membres de la famille.
2.	Gazette papier pour les grands-parents :
o	Chaque mois (selon l’abonnement choisi), les messages et photos partagés sont compilés automatiquement par Myfamily dans une jolie gazette personnalisée.
o	La gazette est ensuite imprimée et envoyée par courrier aux grands-parents ou à l’être cher.
L’objectif ?
Permettre aux grands-parents de rester connectés à leur famille sans avoir besoin d’un ordinateur ou d’un smartphone. Ils reçoivent un support tangible, facile à lire et qui leur fait plaisir !
Points forts :
•	Accessible à tous les âges.
•	Simple à utiliser pour la famille.
•	Une vraie gazette papier à conserver, un joli souvenir.

MyFamily est une plateforme numérique innovante visant à renforcer les liens familiaux intergénérationnels à travers la création et le partage d'une gazette personnalisée. Cette solution répond au besoin croissant de maintenir des connections significatives entre les générations, particulièrement avec les aînés qui peuvent être moins à l'aise avec les technologies numériques.

#### 1.2 Objectifs
- Faciliter la communication entre les générations
- Réduire l'isolement des personnes âgées
- Créer un support physique de partage familial
- Simplifier le partage de moments de vie pour les familles
- Offrir une expérience utilisateur multilingue et multiculturelle
- Assurer une gestion financière collaborative et transparente

#### 1.3 Public Cible
- Familles multigénérationnelles
- Personnes âgées (destinataires principaux)
- Membres de famille éloignés géographiquement
- Communautés multiculturelles et multilingues

### 2. Spécifications Fonctionnelles

#### 2.1 Interface Utilisateur Web/Mobile

##### 2.1.1 Support Linguistique
- 8 langues principales incluant :
  - Hébreu (avec support RTL)
  - Anglais
  - Français
  - Espagnol
  - Arabe
  - Russe
  - Portugais
  - Allemand
- Interface adaptative selon la langue
- Traduction automatique des contenus

##### 2.1.2 Systèmes de Calendrier
- Support de 4 calendriers principaux :
  - Grégorien
  - Hébraïque
  - Musulman
  - Chinois
- Synchronisation entre les calendriers
- Affichage adapté des dates selon les préférences

#### 2.1.1 Inscription et Connexion
- Inscription via email/mot de passe
- Connexion via Google
- Vérification en deux étapes (2FA)
- Récupération de mot de passe sécurisée
- Session "Se souvenir de moi"

##### 2.1.3 Espace Famille
- Création et gestion du compte famille
- Tableau de bord personnalisé
- Gestion des membres
- Interface de publication
- Suivi des abonnements
- posibilité d'appartenir à plusieur familles et swich d'une famille à l'autre

##### 2.1.4 Profil Membre
- Informations personnelles :
  - Photo de profil
  - Informations de contact
  - Préférences linguistiques
- Gestion des enfants :
  - Ajout des enfants avec leurs informations :
    - Nom et prénom
    - Date de naissance
    - Photo
  - Modification/suppression des informations enfants
  - Validation automatique pour les anniversaires
- Paramètres de confidentialité
- Préférences de notification

##### 2.1.5 Système d'Invitation
- Génération de liens d'invitation uniques
- Invitation par email avec :
  - Message personnalisable
  - Délai d'expiration
  - Suivi des invitations
- Validation des nouveaux membres
- Gestion des rôles et permissions

##### 2.1.6 Gestion du Contenu
- Upload de photos :
  - Formats : JPEG, PNG
  - Contrôle qualité automatique
  - Système de légendes personnalisées
- Import par email :
  - Adresse dédiée par famille
  - Traitement automatique
  - Validation qualité
  - Notifications de statut
- Rédaction de textes :
  - Limite de 500 caractères par texte
  - Support multilingue
  - Formatage basique

#### 2.2 Système de Cagnotte Familiale

##### 2.2.1 Gestion de la Cagnotte
- Solde en temps réel
- Multi-devises
- Historique des transactions
- Tableau de bord financier
- Rapports de contribution

##### 2.2.2 Système de Paiement Cascade
1. Vérification automatique du solde
2. Prélèvement prioritaire sur la cagnotte
3. Repli sur carte bancaire si nécessaire
4. Gestion des échecs de paiement
5. Système de déblocage

##### 2.2.3 Notifications Financières
- Alertes de solde bas
- Rappels de paiement
- Confirmations de transaction
- Rapports mensuels

##### 2.2.4 Systeme code promo
- creation du code promo qui donne droit à la reduction
- possibilité d'ajouter le code lors de la creation de la famille pour beneficier de la reduction
- liste  pour l'admin des codes promo utilisé et combien de fois

#### 2.3 Génération de Gazette

##### 2.3.1 Mise en Page
- Structure standardisée :
  - Couverture personnalisée
  - Deuxième de couverture dédiée :
    - Liste des anniversaires du mois (membres et enfants)
      - Affichage photo
      - Date de naissance
      - Âge
    - Calendrier des événements à venir
  - Pages de contenu
  - Quatrième de couverture
- Templates prédéfinis
- Adaptation automatique au contenu
- Options de personnalisation :
  - Couleurs
  - Polices
  - Disposition
- Gestion des contraintes photos

##### 2.3.2 Gestion des Photos
- Upload de photos :
  - Formats : JPEG, PNG
  - Minimum 15 photos par gazette
  - Maximum 28 photos par gazette
  - Ordre chronologique d'ajout
  - Contrôle qualité automatique
- Système de légendes :
  - Champ texte associé à chaque photo
  - Affichage du nom de l'auteur
  - Miniature de la photo de profil de l'auteur
  - Formatage automatique dans la mise en page

##### 2.3.3 Workflow de Publication
- Validation du contenu
- Vérification du paiement
- Génération automatique PDF en fin de mois
- Contrôle qualité
- Envoi à l'impression

### 3. Spécifications Techniques

#### 3.1 Architecture Technique

##### 3.1.1 Frontend
- Application React.js
- Application mobile React Native
- Design responsive
- PWA capabilities

##### 3.1.2 Backend
- API REST (Node.js)
- PostgreSQL
- Redis pour le cache
- AWS S3 pour le stockage

##### 3.1.3 Système de Paiement
- Stripe (international)
- Tranzillia (Israël)
- Gestion multi-devises
- Système de cagnotte virtuelle

#### 3.2 Sécurité
- Authentification JWT
- Chiffrement des données
- Conformité RGPD
- Audit trail
- Protection contre la fraude

#### 3.3 Performance
- Temps de chargement < 3s
- Optimisation des images
- CDN
- Load balancing

### 4. Processus de Production

#### 4.1 Génération de la Gazette
- Format A4
- Haute qualité d'impression
- Options de papier
- QR codes interactifs

#### 4.2 Logistique
- Intégration services d'impression
- Routage postal international
- Suivi des envois
- Gestion des retours

### 5. Modèle Économique et Facturation

#### 5.1 Tarification
- Prix standard : 70 shekels
- Prix promotionnel avec code promo : 50 shekels
- Conversion automatique des devises
- Frais de port inclus

#### 5.2 Options Premium
- Pages supplémentaires
- Papier premium
- Templates exclusifs
- Fonctionnalités avancées

### 6. Gestion de Projet

#### 6.1 Phases de Développement
1. Phase 1 : Core features
2. Phase 2 : Premium features
3. Phase 3 : Évolutions futures

#### 6.2 Support et Maintenance
- Support multilingue
- Documentation utilisateur
- Maintenance évolutive
- Mises à jour régulières

### 7. Sécurité et Conformité

#### 7.1 Protection des Données
- Chiffrement bout en bout
- Backup quotidien
- Politique de rétention
- Anonymisation

#### 7.2 Conformité Légale
- RGPD
- CCPA
- Lois locales
- Conditions d'utilisation

### 8. Évolutions Futures (V2)

#### 8.1 Fonctionnalités Prévues
- Arbre généalogique interactif
- Cahier de recettes familiales
- Messagerie interne
- Retouche photo avancée

#### 8.2 Intégrations
- Réseaux sociaux
- Services de stockage cloud
- APIs tierces
- Services d'impression locaux
```