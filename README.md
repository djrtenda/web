# DJR Tenda - Salary Management System

## Introduction

The DJR Tenda Salary Management System is a comprehensive, real-time web application designed for efficient and secure management of employee payroll. Developed with a robust Firebase backend and a clean, responsive interface using Tailwind CSS, the system offers distinct, role-based functionalities for administrators and employees. It streamlines complex payroll processes, from bulk salary distribution to individual transaction tracking, ensuring data integrity and providing a transparent financial overview for all users.

This application is engineered to be a scalable, secure, and user-friendly solution for modern businesses aiming to optimize their payroll operations.

![App Banner](https://i.postimg.cc/gkXJg6ry/Proyek-Baru-41-65-A19-DA.png)

---

## Core Features

The system is architecturally divided into two primary interfaces, tailored to the specific needs of administrators and employees.

### 👑 Administrator Dashboard

The Administrator Dashboard serves as the central control panel for all payroll activities, offering comprehensive management tools:

* **Real-time Analytics**: A dynamic dashboard provides key performance indicators, including total employee count, aggregate salary distributed, and pending withdrawal requests.
* **Interactive Data Visualization**: A bar chart visualizes salary distribution trends over the preceding six months.
* **Employee Management**: Functionality to add new employees and view a detailed list of all personnel with their respective account balances.
* **Bulk Salary Distribution**: A feature enabling simultaneous salary payment to all employees with a single action.
* **Withdrawal Request Management**: A dedicated interface for reviewing, approving, and rejecting employee withdrawal requests.
* **Comprehensive Transaction Log**: A paginated and filterable ledger detailing all system transactions.
* **PDF Reporting**: One-click generation of professional PDF reports for recent transactions.

### 💼 Employee Dashboard

The Employee Dashboard provides a secure, intuitive, and mobile-responsive portal for staff to manage their financial information:

* **Real-time Balance Inquiry**: Displays the current salary balance with live updates.
* **Withdrawal Requests**: A simple interface for submitting requests to withdraw funds from an available balance.
* **Transaction History**: A detailed history of all salary payments and withdrawals, with clear status indicators.
* **Financial Summary**: An at-a-glance overview of total remuneration received and total funds withdrawn.

---

## Technical Specifications

The project is built upon a modern, serverless architecture to ensure high performance, scalability, and maintainability.

* **Backend & Database**: **Firebase (Firestore & Firebase Auth)** is utilized for real-time data storage, secure user authentication, and role-based access control.
* **Frontend Framework**: **Tailwind CSS** provides a utility-first framework for creating a highly customizable and responsive user interface.
* **Core Language**: **JavaScript (ES6+)** serves as the primary language for all client-side logic and asynchronous communication with Firebase services.
* **Data Visualization**: **Chart.js** is integrated to render interactive charts within the administrator dashboard.
* **Report Generation**: **jsPDF** & **jsPDF-AutoTable** are used for client-side generation of downloadable PDF documents.

---

## System Implementation Guide

To deploy the DJR Tenda Salary Management System, please follow the steps outlined below.

1.  **Clone the Repository**
    Clone the project source code to your local machine:
    ```bash
    git clone https://github.com/djrtenda/web
    cd djr-tenda-system
    ```

2.  **Configure Firebase**
    * Navigate to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    * Enable **Firestore** and **Firebase Authentication** (with the Email/Password provider).
    * In your project settings, find your Firebase configuration object.
    * Create a file named `firebase-config.js` in the root directory and paste your configuration:
        ```javascript
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID"
        };
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();
        ```

3.  **Establish User Roles in Firestore**
    * Manually add users in the Firebase Authentication tab.
    * In Firestore, create a `users` collection.
    * For each user, create a document with their UID as the document ID. The document must contain a `role` field (`admin` or `employee`) and a `name` field.

4.  **Launch the Application**
    * Use a local development server (e.g., Live Server in VS Code) to open `index.html`.
    * Log in with the credentials created in Firebase.

---

## Contact & Support

For any inquiries, feedback, or bug reports, please feel free to reach out.

<a href="https://wa.me/6285254597065">
  <img src="https://img.shields.io/badge/Contact-WhatsApp-green?style=for-the-badge&logo=whatsapp" alt="Contact via WhatsApp">
</a>
