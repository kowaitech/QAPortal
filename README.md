The Interview Portal is a comprehensive online assessment and examination system designed for educational institutions and organizations. It provides a complete solution for conducting digital interviews, tests, and evaluations with role-based access control for administrators, staff, and students.

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **React Hook Form** - Form management
- **Zustand** - State management
- **TanStack React Query** - Data fetching and caching
- **Axios** - HTTP client
- **XLSX & File-Saver** - Excel file generation and download

**Backend:**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Bcryptjs** - Password hashing
- **Nodemailer** - Email functionality
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

## �� Design System

### Color Theme: Calm & Focused (Purple + Neutral)
- **Primary**: Purple `#552e81` - Main actions, headers, buttons
- **Secondary**: Lavender `#A78BFA` - Hover effects, accents
- **Background**: Light Gray `#F9FAFB` - Page backgrounds
- **Surface**: Off-White `#FFFFFF` or `#F3F4F6` - Card backgrounds
- **Text Primary**: Dark Slate `#1E293B` - Strong readability
- **Text Secondary**: Medium Gray `#6B7280` - Subtle text
- **Success**: Mint Green `#6EE7B7` - Success states

## 👥 User Roles & Permissions

### 1. **Admin** (`admin`)
- **Full system control and management**
- User approval and management
- Test scheduling and configuration
- Domain and question oversight
- System analytics and reporting

### 2. **Staff** (`staff`)
- **Educational content and evaluation management**
- Question creation and management
- Student answer evaluation and marking
- Domain-specific content management
- Excel report generation

### 3. **Student** (`student`)
- **Test participation and submission**
- Test taking and answer submission
- View assigned tests and schedules
- Access to test results and feedback

## 📊 Database Schema

### Core Models

#### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
   password: String (required),
  role: Enum ['admin', 'staff', 'student'],
  isActive: Boolean (default: false),
  disabled: Boolean (default: false),
  resetOtpCode: String,
  resetOtpExpires: Date
}
```

#### Domain Model
```javascript
{
  name: String (required, unique),
  createdBy: ObjectId (ref: User)
}
```

#### Question Model
```javascript
{
  title: String (required),
  description: String (required),
  domain: ObjectId (ref: Domain),
  section: Enum ['A', 'B'],
  difficulty: Enum ['easy', 'medium', 'hard'],
    answerText: String,
  isActive: Boolean,
  createdBy: ObjectId (ref: User),
  updatedBy: ObjectId (ref: User)
}
```

#### Test Model
```javascript
{
  title: String (required),
  domains: [ObjectId] (ref: Domain),
  startDate: Date (required),
  endDate: Date (required),
  durationMinutes: Number (default: 60),
  sections: [String] (default: ["A","B"]),
  status: Enum ["inactive","active","finished"],
  eligibleStudents: [ObjectId] (ref: User)
}
```

#### StudentAnswer Model
```javascript
{
  student: ObjectId (ref: User),
  domain: ObjectId (ref: Domain),
  question: ObjectId (ref: Question),
  test: ObjectId (ref: Test),
   section: Enum ['A', 'B'],
  answerText: String,
  submittedAt: Date,
  examStartTime: Date,
  examEndTime: Date,
  isSubmitted: Boolean,
  mark: Number (min: 0)
}
```

#### StudentTest Model
```javascript
{
  student: ObjectId (ref: User),
  test: ObjectId (ref: Test),
  startTime: Date,
  dueTime: Date,
  endTime: Date,
  score: Number,
  selectedDomain: ObjectId (ref: Domain),
  selectedSection: String,
  status: Enum ["pending","in-progress","completed","expired"]
}
```

## 🔐 Authentication & Security

### JWT-Based Authentication
- **Access Tokens**: Secure user sessions
- **Role-Based Access Control**: Route protection by user roles
- **Password Security**: Bcrypt hashing with salt rounds
- **Session Management**: Automatic token validation

### Security Features
- **Helmet.js**: Security headers and protection
- **CORS**: Controlled cross-origin requests
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Restricted file types and sizes

## 📱 Page-by-Page Functionality

### 🔐 Authentication Pages

#### 1. **Login Page** (`/login`)
**Purpose**: User authentication and role-based redirection
**Features**:
- Email and password authentication
- Role-based dashboard redirection (admin/staff/student)
- "Forgot Password" link integration
- Form validation with error handling
- Loading states during authentication
- Custom modal dialogs for user feedback

#### 2. **Register Page** (`/register`)
**Purpose**: New user registration with admin approval workflow
**Features**:
- User registration form (name, email, password, role selection)
- Automatic account deactivation (requires admin approval)
- Email validation and duplicate checking
- Password strength requirements
- Success/error feedback with custom modals
- Redirect to login after successful registration

#### 3. **Forgot Password Page** (`/forgot-password`)
**Purpose**: Password reset initiation
**Features**:
- Email-based password reset request
- OTP generation and email delivery
- Form validation and error handling
- Integration with email service (Nodemailer)
- Custom modal feedback system

#### 4. **Reset Password Page** (`/reset-password`)
**Purpose**: Password reset completion
**Features**:
- OTP verification
- New password setting
- Password confirmation validation
- Secure password update process
- Success feedback and login redirection

### �� Admin Dashboard (`/admin`)

#### **Admin Dashboard Main Page**
**Purpose**: Complete system administration and oversight
**Features**:

**User Management**:
- **Pending Users Tab**: View and approve/reject new registrations
  - List of users awaiting approval
  - Approve/Reject actions with confirmation modals
  - User details (name, email, role, registration date)
  - Bulk approval capabilities

- **Registered Users Tab**: Manage active users
  - Complete list of approved users
  - User status management (active/disabled)
  - User role modification
  - Registration and last activity tracking

**Test Management**:
- **Test Scheduling**: Create and manage test schedules
- **Domain Assignment**: Assign domains to tests
- **Student Eligibility**: Manage eligible students for tests
- **Test Status Control**: Activate/deactivate tests

**System Analytics**:
- User statistics and growth metrics
- Test completion rates
- System performance monitoring
- Export capabilities for reports

#### **Test Schedule Page** (`/admin/tests`)
**Purpose**: Comprehensive test management and scheduling
**Features**:
- **Test Creation**: Create new tests with scheduling
- **Domain Selection**: Assign multiple domains to tests
- **Time Management**: Set start/end dates and duration
- **Student Assignment**: Select eligible students
- **Test Status Management**: Control test availability
- **Bulk Operations**: Manage multiple tests simultaneously

### ��‍�� Staff Dashboard (`/staff`)

#### **Staff Dashboard Main Page**
**Purpose**: Educational content management and student evaluation
**Features**:

**Question Management**:
- **Create Questions**: Add new questions with rich text descriptions
- **Domain Assignment**: Categorize questions by domains
- **Section Organization**: Organize questions into sections A and B
- **Difficulty Levels**: Set question difficulty (easy/medium/hard)
- **File Attachments**: Upload images and PDFs for questions
- **Question Status**: Activate/deactivate questions

**Student Answer Evaluation**:
- **View Answers**: Access all student submissions by domain
- **Test Filtering**: Filter answers by specific tests within domains
- **Individual Marking**: Add/edit marks for each question answer
- **Mark Persistence**: Marks saved to MongoDB with real-time updates
- **Total Calculation**: Calculate and store total marks per student
- **Answer Review**: Review student responses with timestamps

**Reporting & Analytics**:
- **Excel Export**: Download comprehensive reports
  - **Answers & Marks Report**: Username, email, individual marks, total marks
  - **Completed Users Report**: List of users who completed tests
- **Filtered Downloads**: Export data based on test filters
- **Progress Tracking**: Monitor evaluation progress
- **Quality Control**: Ensure all answers are marked before export

**Domain Management**:
- **Domain Overview**: View all available domains
- **Content Organization**: Manage questions within domains
- **Performance Metrics**: Track domain-specific statistics

### 🎓 Student Dashboard (`/student`)

#### **Student Dashboard Main Page**
**Purpose**: Test access and participation management
**Features**:
- **Available Tests**: View assigned and available tests
- **Test Status**: See test schedules and deadlines
- **Progress Tracking**: Monitor completed and pending tests
- **Results Access**: View marks and feedback (when available)
- **Test History**: Access to previous test attempts

#### **Tests Page** (`/student/tests`)
**Purpose**: Detailed test information and access
**Features**:
- **Test Listings**: Comprehensive list of available tests
- **Test Details**: View test information, duration, and domains
- **Eligibility Check**: Verify test access permissions
- **Schedule Information**: View test timing and deadlines
- **Start Test**: Direct access to test taking interface

#### **Take Test Page** (`/student/take/:id`)
**Purpose**: Interactive test taking experience
**Features**:

**Test Setup**:
- **Domain Selection**: Choose from available domains
- **Section Selection**: Select section A or B
- **Test Validation**: Verify test eligibility and timing

**Test Interface**:
- **Question Display**: Present questions with rich formatting
- **File Support**: View attached images and PDFs
- **Timer Management**: Real-time countdown timer
- **Answer Submission**: Text-based answer input
- **Auto-Save**: Automatic answer saving
- **Navigation**: Move between questions

**Test Management**:
- **Time Tracking**: Monitor remaining time
- **Submission Control**: Submit answers with confirmation
- **Session Management**: Handle test sessions securely
- **Progress Indicators**: Show completion status

## �� API Endpoints

### Authentication Routes (`/auth`)
- `POST /login` - User authentication
- `POST /register` - User registration
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Password reset completion

### Admin Routes (`/admin`)
- `GET /pending` - Get pending user approvals
- `GET /registered` - Get registered users
- `POST /approve/:id` - Approve user registration
- `POST /reject/:id` - Reject user registration
- `PUT /users/:id` - Update user information

### Question Routes (`/questions`)
- `GET /` - Get questions with filtering
- `POST /` - Create new question
- `PUT /:id` - Update question
- `DELETE /:id` - Delete question
- `POST /:id/upload` - Upload question files

### Domain Routes (`/domains`)
- `GET /` - Get all domains
- `POST /` - Create new domain
- `GET /:id/answers` - Get student answers for domain
- `GET /:id/tests` - Get tests for domain
- `GET /:id/completed-users` - Get completed users

### Student Answer Routes (`/student-answers`)
- `POST /submit` - Submit student answer
- `POST /:answerId/mark` - Add/edit mark for answer
- `POST /calculate-total` - Calculate total marks

### Test Routes (`/tests`)
- `GET /` - Get available tests
- `POST /` - Create new test
- `POST /:id/start` - Start test session
- `PUT /:id` - Update test

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure environment variables
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Configure environment variables
npm run dev
```

### Environment Variables
```env
# Backend (.env)
MONGO_URI=mongodb://localhost:27017/interview-portal
JWT_ACCESS_SECRET=your-secret-key
CLIENT_ORIGIN=http://localhost:5173
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend (.env)
VITE_API_BASE=http://localhost:8080
```

## �� Key Features

### 1. **Role-Based Access Control**
- Secure authentication with JWT tokens
- Route protection based on user roles
- Granular permissions for different user types

### 2. **Comprehensive Test Management**
- Flexible test scheduling and configuration
- Multi-domain test support
- Section-based question organization
- Time-limited test sessions

### 3. **Advanced Evaluation System**
- Individual question marking
- Total score calculation and persistence
- Excel report generation
- Filtered data export capabilities

### 4. **Modern UI/UX**
- Responsive design with Tailwind CSS
- Custom modal system replacing native alerts
- Smooth animations and transitions
- Consistent purple-themed design system

### 5. **File Management**
- Image and PDF upload support
- Secure file storage and serving
- File type validation and size limits

### 6. **Email Integration**
- Password reset functionality
- User notification system
- OTP-based verification

### 7. **Data Export & Reporting**
- Excel file generation (.xlsx)
- Comprehensive reporting capabilities
- Filtered data export
- User progress tracking

## 🔄 Workflow Examples

### Student Test Taking Workflow
1. Student logs in and views available tests
2. Selects a test and chooses domain/section
3. Takes the test with timer and auto-save
4. Submits answers for evaluation
5. Views results when available

### Staff Evaluation Workflow
1. Staff logs in and accesses student answers
2. Reviews answers by domain or specific test
3. Adds individual marks for each question
4. Calculates total marks for students
5. Exports comprehensive reports to Excel

### Admin Management Workflow
1. Admin approves new user registrations
2. Creates and schedules tests
3. Assigns domains and eligible students
4. Monitors system performance and user activity
5. Manages overall system configuration

## 🛡️ Security Considerations

- **Password Security**: Bcrypt hashing with salt rounds
- **JWT Tokens**: Secure session management
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Restricted file types and validation
- **CORS Configuration**: Controlled cross-origin access
- **Helmet.js**: Security headers and protection
- **Role-Based Access**: Granular permission system

## 📈 Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **React Query**: Efficient data fetching and caching
- **Lazy Loading**: Component-based code splitting
- **File Optimization**: Compressed assets and images
- **CDN Ready**: Static file serving optimization

## 🔮 Future Enhancements

- **Real-time Notifications**: WebSocket integration
- **Advanced Analytics**: Detailed reporting dashboard
- **Mobile App**: React Native mobile application
- **API Documentation**: Swagger/OpenAPI integration
- **Automated Testing**: Comprehensive test suite
- **Multi-language Support**: Internationalization
- **Advanced Security**: Two-factor authentication
- **Cloud Integration**: AWS/Azure deployment support

---

## 📞 Support & Contact

For technical support, feature requests, or bug reports, please contact the development team or create an issue in the project repository.

**Version**: 1.0.0  
**Last Updated**: January 2025  
**License**: MIT