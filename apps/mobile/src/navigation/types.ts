// Vidyut Mobile — Navigation Type Definitions

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Dashboard:  undefined;
  Students:   undefined;
  Attendance: undefined;
  Fees:       undefined;
};

export type StudentsStackParamList = {
  StudentList:   undefined;
  StudentDetail: { studentId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
