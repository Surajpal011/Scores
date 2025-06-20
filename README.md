
# 🏏 Live Sports Score Fetcher

A real-time sports score fetching application that delivers **live match updates** using **GraphQL APIs** and **WebSockets**. This project demonstrates how to connect to external live score services (such as `theScore`) and visualize live data in a modern, responsive frontend.

---

## 📌 Project Summary

This project fetches **live sports scores** using a WebSocket connection to a GraphQL API. It maintains a persistent connection to receive match updates in real-time and dynamically displays the data using a modern React-based frontend. Ideal for use cases like live dashboards, sports tickers, or match viewers.

---

## 🔧 Key Features

- ⚡ Real-time score updates using WebSockets
- 🌐 GraphQL API integration
- 💻 Modern UI with React + Tailwind CSS
- 🔄 Live data auto-refresh without manual reload
- 🔒 Secured API credentials via `.env` file

---

## 🧰 Tech Stack

| Layer       | Tech Stack                         |
|-------------|------------------------------------|
| Frontend    | React, TypeScript, Tailwind CSS    |
| Backend     | Node.js, Express, WebSocket (`ws`) |
| Protocols   | GraphQL, WebSocket                 |
| Tools       | dotenv, concurrently, nodemon      |

---

## ⚙️ Environment Setup

Create a `.env` file in the root directory using the format below:

```env
# WebSocket  configuration

WS_URL=your_web_socket_url

USER_AGENT=your_user_agent_string_here

AUTH_TOKEN=your_auth_token_here

API_VERSION=your_api_version_here

  

# MLB  API  endpoints

SCORE_SCHEDULE_URL=your_mlb_schedule_api_url_here

SCORE_EVENTS_URL=your_mlb_events_api_url_prefix_here


