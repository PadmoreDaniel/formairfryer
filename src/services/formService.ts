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
import { Form, Project } from '../types';

export interface SavedForm {
  id: string;
  userId: string;
  form: Form;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedProject {
  id: string;
  userId: string;
  project: Project;
  createdAt: Date;
  updatedAt: Date;
}

const FORMS_COLLECTION = 'forms';
const PROJECTS_COLLECTION = 'projects';

/**
 * Recursively remove `undefined` values, which Firestore rejects.
 * Optional fields (e.g. defaultPrevStep set to "First previous step") are
 * stored as `undefined` in state and must be stripped before saving.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = stripUndefined(val);
      }
    }
    return result as T;
  }
  return value;
}

/**
 * Save a form to Firestore
 */
export async function saveForm(userId: string, form: Form): Promise<string> {
  const formRef = doc(collection(db, FORMS_COLLECTION));
  const now = Timestamp.now();
  
  await setDoc(formRef, {
    userId,
    form: stripUndefined(form),
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
    form: stripUndefined(form),
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

// ==================== Projects ====================

/**
 * Get all forms belonging to a project for a user.
 */
export async function getProjectForms(userId: string, projectId: string): Promise<SavedForm[]> {
  const forms = await getUserForms(userId);
  return forms.filter((f) => f.form.projectId === projectId);
}

/**
 * Save a new project to Firestore. Uses the project's own id as the doc id so
 * child forms can reference it deterministically.
 */
export async function saveProject(userId: string, project: Project): Promise<string> {
  const projectRef = doc(db, PROJECTS_COLLECTION, project.id);
  const now = Timestamp.now();

  await setDoc(projectRef, {
    userId,
    project: stripUndefined(project),
    createdAt: now,
    updatedAt: now,
  });

  return project.id;
}

/**
 * Update an existing project in Firestore.
 */
export async function updateProject(project: Project): Promise<void> {
  const projectRef = doc(db, PROJECTS_COLLECTION, project.id);

  await setDoc(projectRef, {
    project: stripUndefined(project),
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

/**
 * Get a single project by ID.
 */
export async function getProject(projectId: string): Promise<SavedProject | null> {
  const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    return null;
  }

  const data = projectSnap.data();
  return {
    id: projectSnap.id,
    userId: data.userId,
    project: data.project,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

/**
 * Get all projects for a user, most recently updated first.
 */
export async function getUserProjects(userId: string): Promise<SavedProject[]> {
  const projectsQuery = query(
    collection(db, PROJECTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  const querySnapshot = await getDocs(projectsQuery);

  return querySnapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      project: data.project,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  });
}

/**
 * Delete a project. Does not delete child forms; callers should reassign or
 * remove child forms first to avoid orphans.
 */
export async function deleteProject(projectId: string): Promise<void> {
  const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(projectRef);
}
