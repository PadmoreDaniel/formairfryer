import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Form } from '../types';

export interface SavedForm {
  id: string;
  userId: string;
  form: Form;
  createdAt: Date;
  updatedAt: Date;
}

const FORMS_COLLECTION = 'forms';

/**
 * Save a form to Firestore
 */
export async function saveForm(userId: string, form: Form): Promise<string> {
  const formRef = doc(collection(db, FORMS_COLLECTION));
  const now = Timestamp.now();
  
  await setDoc(formRef, {
    userId,
    form,
    createdAt: now,
    updatedAt: now,
  });
  
  return formRef.id;
}

/**
 * Update an existing form in Firestore
 */
export async function updateForm(formId: string, form: Form): Promise<void> {
  const formRef = doc(db, FORMS_COLLECTION, formId);
  
  await setDoc(formRef, {
    form,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

/**
 * Get a single form by ID
 */
export async function getForm(formId: string): Promise<SavedForm | null> {
  const formRef = doc(db, FORMS_COLLECTION, formId);
  const formSnap = await getDoc(formRef);
  
  if (!formSnap.exists()) {
    return null;
  }
  
  const data = formSnap.data();
  return {
    id: formSnap.id,
    userId: data.userId,
    form: data.form,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

/**
 * Get all forms for a user
 */
export async function getUserForms(userId: string): Promise<SavedForm[]> {
  const formsQuery = query(
    collection(db, FORMS_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(formsQuery);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      form: data.form,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  });
}

/**
 * Delete a form
 */
export async function deleteForm(formId: string): Promise<void> {
  const formRef = doc(db, FORMS_COLLECTION, formId);
  await deleteDoc(formRef);
}
