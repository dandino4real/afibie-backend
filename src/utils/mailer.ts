
import nodemailer from 'nodemailer';
import dotenv from 'dotenv'
dotenv.config()

console.log('Email_user', process.env.EMAIL_USER)

export const transporter = nodemailer.createTransport({
  // service: 'gmail', // Or use SMTP for production
  host: 'smtp.gmail.com',
  port: 587, 
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

