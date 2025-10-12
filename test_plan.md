# `test_plan.md`

## 1. Sign Up Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Name: V`, `Email: user@ gmail.com` | Tooltip error message: "A part following '@' should not contain the symbol ' '". | A tooltip error message is shown. | Passed | ![Invalid Signup Case](test_plan/signup_invalid_case.png) |
| **Valid** | `Name: Vi`, `Email: user@gmail.com` | Account created successfully. | A "Login successful" message is shown. | Passed | ![Valid Signup Case](test_plan/signup_valid_case.png) |

---

## 2. Sign In Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: gautam.thota@example.com`, `Password: dlufgsiudfi` | Error message: "Invalid email or password". | A red banner with the text "Invalid email or password" is displayed. | Passed | ![Invalid Signin Case](test_plan/signin_invalid_case.png) |
| **Valid** | `Email: gautam.thota@example.com`, `Password: 123456` | User successfully authenticated. | A green banner with "Login successful" is displayed. | Passed | ![Valid Signin Case](test_plan/signin_valid_case.png) |

---

## 3. Profile Update Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Phone: 2355` | Alert message: "Please enter a valid 10-digit Indian phone number starting with 9, 8, 7, or 6." | A JavaScript alert appears. | Passed | ![Invalid Profile Case](test_plan/profile_invalid_case.png) |
| **Valid** | `Phone: 7869408765` | Profile updated successfully. | A JavaScript alert appears saying: "Profile updated successfully!". | Passed | ![Valid Profile Case](test_plan/profile_valid_case.png) |

---

## 4. Payment Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Expiry: 23/34` | Alert message: "Invalid month. Please enter a value between 01 and 12." | A JavaScript alert appears. | Passed | ![Invalid Payment Case](test_plan/payment_invalid_case.png) |
| **Valid** | `Expiry: 12/34` | The form passes validation. | The form submits successfully. | Passed | ![Valid Payment Case](test_plan/payment_valid_case.png) |

---

## 5. Sign Up Test Cases for Shopmanager

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Name: Jeevan`, `Email: jeevankumar.vendor@gmail.com`, `Contact Number:9456521365`,`password:12345678`,`confirm password:12345678`,`Store name:Wholesale`,`Store Location:Warangal` | error message: "Please enter a valid 10-digit phone number and Please enter a valid Gmail address(e.g.,example@gmail.com)". | A error message is shown. | Passed | ![Invalid Signup Case](./test_plan/store_signup_invaid.png) |
| **Valid** | `Name: Jeevan`, `Email: jeevankumar.vendor@gmaill.com`, `Contact Number:94565213657`,`password:12345678`,`confirm password:12345678`,`Store name:Wholesale`,`Store Location:Warangal` | Account created successfully. | A "Login successful" message is shown. | Passed | ![Valid Signup Case](./test_plan/store_signup_valid.png) |

---

## 6. Sign In Test Cases for Shopmanager

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: veda.prakash.vendor@gmaqil.com`, `Password: 12345678`,`Role : Store Manager`| Error message: "Invalid email or password". | A red banner with the text "Invalid email or password" is displayed. | Passed | ![Invalid Signin Case](./test_plan/shop_manager_login_invalid.png) |
| **Valid** | `Email: veda.prakash.vendor@gmail.com`, `Password: 12345678`,`Role : Store Manager`| User successfully authenticated. | A green banner with "Login successful" is displayed. | Passed | ![Valid Signin Case](./test_plan/shop_manager_login_valid.png) |

---

## 7. Profile Update Test Cases for Shopmanager

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: veda.prakasah.vendor@gmaail.com` | Alert message: "Please use a Valid email from  a valid provider" | A JavaScript alert appears. | Passed | ![Invalid Profile Case](./test_plan/shop_manager_profile_edit_invalid.png) |
| **Valid** | `Email: veda.prakasah.vendor@gmail.com` | Profile updated successfully. | A JavaScript alert appears saying: "Profile updated successfully!". | Passed | ![Valid Profile Case](./test_plan/shop_manager_profile_edit_valid.png) |

---

## 8. Add New product Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Productname:Pet Scraching Poll`,`Category:Toys`,`Pet Type:Cat`,`Stock Satus:In Stock`,`Description:New Stock`,`Size:medium`,`Regular Price:400`,`Sale price:500`,`Stock Quantity:15` | error message: "Sale price must be less than regular price" | A error message is shown | Passed | ![Invalid Add product Case](./test_plan/adding_product_invalid.png) |
| **Valid** |  `Productname:Pet Scraching Poll`,`Category:Toys`,`Pet Type:Cat`,`Stock Satus:In Stock`,`Description:New Stock`,`Size:medium`,`Regular Price:400`,`Sale price:350`,`Stock Quantity:15` | Product should be added | Product added successfully. | Passed | ![Valid Add product Case](./test_plan/adding_product_valid.png) |

---

## Event Manager Signup Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Name: J` | Error message: "Name must be at least 2 characters long". | Error message is shown under the name field. | Passed | ![Invalid Name Case](test_plan/eventManager_signup_invalid_case.png) |
| **Valid** | `Name`: John Doe <br> `Contact`: 9876543210 <br> `Email`: john.doe@gmail.com <br> `Password`: password123 <br> `Confirm Password`: password123 <br> `Company`: Doe Events <br> `Location`: Delhi <br> `Terms`: Checked | Form submits successfully and shows a success message. | A "Signup successful! Redirecting..." message is shown. | Passed | ![Valid Signup Case](test_plan/eventManager_signup_invalid_case.png) |

## Sign In Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email: john.doe@gmail.co` <br> `Password: wrongpassword` | Error message: "Invalid email or password". | A red banner with "Invalid email or password" is shown. | Passed | ![Invalid Signin Case](/test_plan/eventManager_signin_invalid_case.png) |
| **Valid** | `Email: john.doe@gmail.com` <br> `Password: correctpassword` | User is successfully authenticated and redirected. | A green banner with "Login successful" is shown. | Passed | ![Valid Signin Case](/test_plan//eventManager_signin_valid_case.png) |

## Create New Event Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Event Name`: Annual Pet Gala <br> `Date and Time`: October 01, 2025, 12:00 pm| Alert message: "⚠️ Please select a future date and time for your event." | A JavaScript alert appears with the future date error. | Passed | ![Invalid Event Date](/test_plan/create_event_invalid_case.png) |
| **Valid** | `Event Name`: Annual Pet Gala <br> `Date and Time`: October 25, 2025, 10:00 AM <br> (All other fields validly filled) | Alert message: "🎉 Event created successfully!" followed by a page reload. | A success alert is shown, and the page reloads. | Passed | ![Valid Event Case](/test_plan/create_event_valid_case.png) |

# Test Plan for Happy Tails Platform

## 1. Event Manager Profile Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email`: john.doe@gmail.co | Alert message: "Please enter a valid Gmail address." | A JavaScript alert appears with the validation error. | Passed | ![Invalid Profile Email](/test_plan/eventManager_profile_invalid_email_case.png) |
| **Valid** | All fields filled with valid data. | Profile updates successfully without errors. | The modal closes and the profile information is updated on the dashboard. | Passed | ![Valid Profile Update](/test_plan/eventManager_profile_valid_email_case.png) |

---
## 3. Update Existing Event Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Date`: October 1, 2025 | Alert message: "Please select a future date and time for your event." | A JavaScript alert appears with the future date error. | Passed | ![Invalid Event Update Date](/test_plan/update_event_invalid_date_case.png) |
| **Valid** | All fields updated with valid data. | The event details are saved successfully without any errors. | The form is saved and the event information is updated. | Passed | ![Valid Event Update](/test_plan/update_event_valid_case.png) |

---

## 4. Edit Attendee Test Cases

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Phone No`: 123456789 | Alert message: "Please enter a valid 10-digit phone number." | A JavaScript alert appears with the phone number validation error. | Passed | ![Invalid Attendee Phone](/test_plan/edit_attendee_invalid_phone_case.png) |
| **Valid** | `Name`: akshay <br> `Phone No`: 1234567890 | Attendee information is saved successfully. | The modal closes and the attendee list shows the updated information. | Passed | ![Valid Attendee Edit](/test_plan/edit_attendee_valid_case.png) |

---

## 5. Book Event Test Cases (User View)

| Case | Input | Expected Result | Actual Result | Status | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invalid** | `Email Address`: akshay@gmail | Alert message: "Please enter a valid email address." | A JavaScript alert appears with the email validation error. | Passed | ![Invalid Booking Email](/test_plan/book_event_invalid_case.png) |
| **Valid** | All personal and booking details filled correctly. | The user proceeds to the payment page without validation errors. | The form is validated, and the "Proceed to Payment" button becomes active. | Passed | ![Valid Booking Form](/test_plan/book_event_valid_case.png) |